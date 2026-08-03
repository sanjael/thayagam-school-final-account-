from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal
import datetime
from app.database import get_db
from app import models, schemas
from app.auth import require_role

router = APIRouter(prefix="/payments", tags=["Fee Payments"])


def _build_receipt_no(db: Session) -> str:
    year = datetime.date.today().year
    count = db.query(func.count(models.Receipt.id)).scalar() + 1
    return f"RCP-{year}-{count:04d}"


def _enrich(p: models.FeePayment) -> schemas.FeePaymentOut:
    out = schemas.FeePaymentOut.from_orm(p)
    if p.student:
        out.student_name = p.student.name
        out.admission_no = p.student.admission_no
        out.phone = p.student.phone
        out.class_name = p.student.class_.name if p.student.class_ else None
    out.receipt_no = p.receipt.receipt_no if p.receipt else None
    return out


@router.get("/", response_model=List[schemas.FeePaymentOut])
def get_payments(
    student_id: Optional[int] = Query(None),
    term: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.FeePayment).options(
        joinedload(models.FeePayment.receipt),
        joinedload(models.FeePayment.student).joinedload(models.Student.class_)
    )
    if student_id:
        q = q.filter(models.FeePayment.student_id == student_id)
    if term:
        q = q.filter(models.FeePayment.term == term)
    if academic_year:
        q = q.filter(models.FeePayment.academic_year == academic_year)
    return [_enrich(p) for p in q.order_by(models.FeePayment.payment_date.desc()).all()]


@router.get("/fee-status")
def get_fee_status(
    student_id: int,
    term: str,
    academic_year: str,
    db: Session = Depends(get_db)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    
    # Calculate term fees and balances sequentially to apply the student-level discount
    terms_sequence = ["Term 1", "Term 2", "Term 3", "Old Fee"]
    term_fees = {}
    term_paid = {}
    for t in terms_sequence:
        if t == "Old Fee":
            term_fees[t] = student.old_fee or Decimal("0")
        else:
            term_fees[t] = db.query(func.sum(models.FeeStructure.amount)).filter(
                models.FeeStructure.class_id      == student.class_id,
                models.FeeStructure.term          == t,
                models.FeeStructure.academic_year == academic_year
            ).scalar() or Decimal("0")
        
        term_paid[t] = db.query(func.sum(models.FeePayment.amount_paid)).filter(
            models.FeePayment.student_id      == student.id,
            models.FeePayment.term            == t,
            models.FeePayment.academic_year   == academic_year,
            models.FeePayment.is_cancelled    == False
        ).scalar() or Decimal("0")

    remaining_discount = student.discount or Decimal("0")
    term_balances = {}
    for t in terms_sequence:
        bal = max(Decimal("0"), term_fees[t] - term_paid[t])
        if bal > 0 and remaining_discount > 0:
            deduct = min(bal, remaining_discount)
            bal -= deduct
            remaining_discount -= deduct
        term_balances[t] = bal
    
    if term in term_balances:
        total_fee = term_fees[term]
        total_paid = term_paid[term]
        balance = term_balances[term]
    else:
        total_fee = db.query(func.sum(models.FeeStructure.amount)).filter(
            models.FeeStructure.class_id      == student.class_id,
            models.FeeStructure.term          == term,
            models.FeeStructure.academic_year == academic_year
        ).scalar() or Decimal("0")
        total_paid = db.query(func.sum(models.FeePayment.amount_paid)).filter(
            models.FeePayment.student_id      == student_id,
            models.FeePayment.term            == term,
            models.FeePayment.academic_year   == academic_year,
            models.FeePayment.is_cancelled    == False
        ).scalar() or Decimal("0")
        balance = max(Decimal("0"), total_fee - total_paid)
    
    return {
        "total_fee": float(total_fee),
        "total_paid": float(total_paid),
        "balance": float(balance),
        "class_name": student.class_.name if student.class_ else None
    }


@router.post("/", response_model=schemas.FeePaymentOut)
def create_payment(
    payload: schemas.FeePaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "accountant"]))
):
    student = db.query(models.Student).filter(models.Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    if payload.term == "Old Fee":
        total = student.old_fee or Decimal("0")
    else:
        total = db.query(func.sum(models.FeeStructure.amount)).filter(
            models.FeeStructure.class_id      == student.class_id,
            models.FeeStructure.term          == payload.term,
            models.FeeStructure.academic_year == payload.academic_year
        ).scalar() or Decimal("0")

    # Fallback to amount_paid if total fee structure is not pre-configured
    if total == 0:
        total = Decimal(str(payload.amount_paid))

    # Sum of previous payments for this student, term, and academic year
    previous_paid = db.query(func.sum(models.FeePayment.amount_paid)).filter(
        models.FeePayment.student_id      == payload.student_id,
        models.FeePayment.term            == payload.term,
        models.FeePayment.academic_year   == payload.academic_year,
        models.FeePayment.is_cancelled    == False
    ).scalar() or Decimal("0")

    # Determine what portion of student-level discount is applicable to this specific term
    terms_sequence = ["Term 1", "Term 2", "Term 3", "Old Fee"]
    remaining_discount = student.discount or Decimal("0")
    term_student_discount = Decimal("0")
    for t in terms_sequence:
        if t == "Old Fee":
            t_fee = student.old_fee or Decimal("0")
        else:
            t_fee = db.query(func.sum(models.FeeStructure.amount)).filter(
                models.FeeStructure.class_id      == student.class_id,
                models.FeeStructure.term          == t,
                models.FeeStructure.academic_year == payload.academic_year
            ).scalar() or Decimal("0")
            
        t_paid = db.query(func.sum(models.FeePayment.amount_paid)).filter(
            models.FeePayment.student_id      == student.id,
            models.FeePayment.term            == t,
            models.FeePayment.academic_year   == payload.academic_year,
            models.FeePayment.is_cancelled    == False
        ).scalar() or Decimal("0")
        
        bal = max(Decimal("0"), t_fee - t_paid)
        
        t_disc = Decimal("0")
        if bal > 0 and remaining_discount > 0:
            t_disc = min(bal, remaining_discount)
            remaining_discount -= t_disc
            
        if t == payload.term:
            term_student_discount = t_disc
            break

    fine_amt = Decimal(str(payload.fine or 0))
    discount_amt = Decimal(str(payload.discount or 0))
    new_total_paid = previous_paid + Decimal(str(payload.amount_paid))
    balance = max(Decimal("0"), (Decimal(str(total)) + fine_amt) - discount_amt - term_student_discount - new_total_paid)

    payment = models.FeePayment(
        student_id    = payload.student_id,
        class_id      = student.class_id,
        term          = payload.term,
        academic_year = payload.academic_year,
        total_fee     = total,
        amount_paid   = payload.amount_paid,
        balance       = balance,
        payment_date  = payload.payment_date,
        payment_mode  = payload.payment_mode,
        fine          = fine_amt,
        discount      = discount_amt,
        reference_no  = payload.reference_no,
        collected_by  = current_user.id if current_user else None,
        notes         = payload.notes,
    )
    db.add(payment)
    db.flush()

    receipt = models.Receipt(receipt_no=_build_receipt_no(db), payment_id=payment.id)
    db.add(receipt)

    # Audit log
    if current_user:
        audit = models.AuditLog(
            user_id=current_user.id,
            action="Record Payment",
            details=f"Payment of ₹{payload.amount_paid} recorded for Student: {student.name} ({student.admission_no}) for {payload.term}"
        )
        db.add(audit)
    
    db.commit()
    db.refresh(payment)
    return _enrich(payment)


@router.get("/{payment_id}", response_model=schemas.FeePaymentOut)
def get_payment(payment_id: int, db: Session = Depends(get_db)):
    p = db.query(models.FeePayment).filter(models.FeePayment.id == payment_id).first()
    if not p:
        raise HTTPException(404, "Payment not found")
    return _enrich(p)

class CancelRequest(schemas.BaseModel):
    reason: str

@router.post("/{payment_id}/cancel")
def cancel_payment(payment_id: int, payload: CancelRequest, db: Session = Depends(get_db)):
    p = db.query(models.FeePayment).filter(models.FeePayment.id == payment_id).first()
    if not p:
        raise HTTPException(404, "Payment not found")
    if p.is_cancelled:
        raise HTTPException(400, "Payment is already cancelled")
        
    p.is_cancelled = True
    p.cancellation_reason = payload.reason
    
    # Audit log
    audit = models.AuditLog(
        user_id=1,
        action="Cancel Payment",
        details=f"Payment ID {p.id} cancelled. Reason: {payload.reason}"
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Payment cancelled successfully"}


@router.put("/{payment_id}", response_model=schemas.FeePaymentOut)
def update_payment(
    payment_id: int, 
    payload: schemas.FeePaymentUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    payment = db.query(models.FeePayment).filter(models.FeePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.is_cancelled:
        raise HTTPException(400, "Cannot edit a cancelled payment")

    payment.amount_paid = Decimal(str(payload.amount_paid))
    payment.payment_date = payload.payment_date
    payment.payment_mode = payload.payment_mode
    payment.fine = Decimal(str(payload.fine or 0))
    payment.discount = Decimal(str(payload.discount or 0))
    payment.reference_no = payload.reference_no
    payment.notes = payload.notes

    # Recalculate balance
    previous_paid = db.query(func.sum(models.FeePayment.amount_paid)).filter(
        models.FeePayment.student_id      == payment.student_id,
        models.FeePayment.term            == payment.term,
        models.FeePayment.academic_year   == payment.academic_year,
        models.FeePayment.is_cancelled    == False,
        models.FeePayment.id              != payment_id
    ).scalar() or Decimal("0")

    new_total_paid = previous_paid + payment.amount_paid
    payment.balance = max(Decimal("0"), (payment.total_fee + payment.fine) - payment.discount - new_total_paid)

    if current_user:
        audit = models.AuditLog(
            user_id=current_user.id,
            action="Update Payment",
            details=f"Payment ID {payment.id} updated. New amount: ₹{payload.amount_paid}, Date: {payload.payment_date}"
        )
        db.add(audit)
    
    db.commit()
    db.refresh(payment)
    return _enrich(payment)

