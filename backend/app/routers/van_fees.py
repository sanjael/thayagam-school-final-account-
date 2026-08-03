from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
import datetime
from decimal import Decimal
from app.database import get_db
from app import models, schemas
from app.auth import require_role

router = APIRouter(prefix="/van-fees", tags=["Van Fees"])


def _build_van_receipt_no(db: Session) -> str:
    year = datetime.date.today().year
    count = db.query(func.count(models.VanPayment.id)).scalar() + 1
    return f"VAN-{year}-{count:04d}"


def _enrich_rider(vr: models.VanRider) -> schemas.VanRiderOut:
    out = schemas.VanRiderOut.from_orm(vr)
    if vr.student:
        out.student_name = vr.student.name
        out.admission_no = vr.student.admission_no
        if vr.student.class_:
            out.class_name = f"{vr.student.class_.name} - {vr.student.class_.section}" if vr.student.class_.section else vr.student.class_.name
    return out


def _enrich_payment(vp: models.VanPayment) -> schemas.VanPaymentOut:
    out = schemas.VanPaymentOut.from_orm(vp)
    if vp.student:
        out.student_name = vp.student.name
        out.admission_no = vp.student.admission_no
        if vp.student.class_:
            out.class_name = f"{vp.student.class_.name} - {vp.student.class_.section}" if vp.student.class_.section else vp.student.class_.name
    return out


@router.get("/riders", response_model=List[schemas.VanRiderOut])
def get_riders(db: Session = Depends(get_db)):
    riders = db.query(models.VanRider).options(
        joinedload(models.VanRider.student).joinedload(models.Student.class_)
    ).all()
    return [_enrich_rider(r) for r in riders]


@router.post("/riders", response_model=schemas.VanRiderOut)
def allocate_rider(payload: schemas.VanRiderCreate, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    
    vr = db.query(models.VanRider).filter(models.VanRider.student_id == payload.student_id).first()
    if vr:
        vr.monthly_fee = Decimal(str(payload.monthly_fee))
    else:
        vr = models.VanRider(
            student_id=payload.student_id,
            monthly_fee=Decimal(str(payload.monthly_fee))
        )
        db.add(vr)
    db.commit()
    db.refresh(vr)
    return _enrich_rider(vr)


@router.delete("/riders/{student_id}")
def deallocate_rider(student_id: int, db: Session = Depends(get_db)):
    vr = db.query(models.VanRider).filter(models.VanRider.student_id == student_id).first()
    if not vr:
        raise HTTPException(404, "Van rider allocation not found")
    db.delete(vr)
    db.commit()
    return {"message": "Student deallocated from van"}


@router.post("/pay", response_model=schemas.VanPaymentOut)
def record_van_payment(payload: schemas.VanPaymentCreate, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    # Check if already paid for this month and academic year
    dup = db.query(models.VanPayment).filter(
        models.VanPayment.student_id == payload.student_id,
        models.VanPayment.month == payload.month,
        models.VanPayment.academic_year == payload.academic_year,
        models.VanPayment.is_cancelled == False
    ).first()
    if dup:
        raise HTTPException(400, f"Student has already paid van fees for {payload.month}")

    receipt_no = _build_van_receipt_no(db)
    payment = models.VanPayment(
        student_id=payload.student_id,
        month=payload.month,
        amount_paid=Decimal(str(payload.amount_paid)),
        payment_date=payload.payment_date,
        payment_mode=payload.payment_mode,
        receipt_no=receipt_no,
        academic_year=payload.academic_year
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return _enrich_payment(payment)


@router.get("/payments", response_model=List[schemas.VanPaymentOut])
def get_payments(academic_year: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(models.VanPayment).options(
        joinedload(models.VanPayment.student).joinedload(models.Student.class_)
    )
    if academic_year:
        q = q.filter(models.VanPayment.academic_year == academic_year)
    payments = q.order_by(models.VanPayment.id.desc()).all()
    return [_enrich_payment(p) for p in payments]


@router.put("/payments/{payment_id}/cancel", dependencies=[Depends(require_role(["admin"]))])
def cancel_van_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(models.VanPayment).filter(models.VanPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.is_cancelled:
        raise HTTPException(400, "Payment is already cancelled")
    payment.is_cancelled = True
    db.commit()
    return {"message": "Payment cancelled successfully"}


@router.get("/reports/dues")
def get_van_dues_report(academic_year: Optional[str] = Query(None), db: Session = Depends(get_db)):
    settings = db.query(models.SchoolSettings).first()
    ay = academic_year or (settings.current_academic_year if settings else "2026-2027")

    # Months in order
    months = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April"]
    
    # Active riders
    riders = db.query(models.VanRider).options(
        joinedload(models.VanRider.student).joinedload(models.Student.class_)
    ).all()

    # Payments made
    payments_list = db.query(models.VanPayment).filter(
        models.VanPayment.academic_year == ay,
        models.VanPayment.is_cancelled == False
    ).all()

    results = []
    for r in riders:
        student = r.student
        if not student or not student.is_active:
            continue

        class_name = f"{student.class_.name} - {student.class_.section}" if student.class_ and student.class_.section else (student.class_.name if student.class_ else "N/A")
        
        # Calculate paid months and unpaid months
        rider_months = []
        total_pending = 0.0

        # Retrieve actual payments for this rider
        rider_payments = [p for p in payments_list if p.student_id == student.id]
        total_paid_amt = float(sum(p.amount_paid for p in rider_payments))

        for m in months:
            paid_for_month = sum(p.amount_paid for p in rider_payments if p.month == m)
            pending_for_month = max(0.0, float(r.monthly_fee) - float(paid_for_month))
            total_pending += pending_for_month

            if paid_for_month >= float(r.monthly_fee):
                status = "Paid"
            elif paid_for_month > 0:
                status = "Partial"
            else:
                status = "Unpaid"

            rider_months.append({
                "month": m,
                "status": status,
                "paid_amount": paid_for_month,
                "pending_amount": pending_for_month
            })

        results.append({
            "student_id": student.id,
            "student_name": student.name,
            "admission_no": student.admission_no,
            "class_name": class_name,
            "monthly_fee": float(r.monthly_fee),
            "months": rider_months,
            "total_paid": total_paid_amt,
            "total_pending": total_pending,
            "phone": student.phone or ""
        })

    return results


@router.put("/payments/{payment_id}", response_model=schemas.VanPaymentOut, dependencies=[Depends(require_role(["admin"]))])
def update_van_payment(payment_id: int, payload: schemas.VanPaymentUpdate, db: Session = Depends(get_db)):
    payment = db.query(models.VanPayment).filter(models.VanPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.is_cancelled:
        raise HTTPException(400, "Cannot edit a cancelled payment")

    payment.amount_paid = Decimal(str(payload.amount_paid))
    payment.payment_date = payload.payment_date
    payment.payment_mode = payload.payment_mode
    payment.month = payload.month

    db.commit()
    db.refresh(payment)
    return _enrich_payment(payment)
