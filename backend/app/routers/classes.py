from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal
from app.database import get_db
from app import models, schemas
from app.auth import require_role

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.get("/", response_model=List[schemas.ClassOut])
def get_classes(academic_year: Optional[str] = None, db: Session = Depends(get_db)):
    ay = academic_year or db.query(models.SchoolSettings.current_academic_year).scalar() or "2024-2025"
    classes = db.query(models.Class).order_by(models.Class.id).all()
    if not classes:
        return []

    # Batch query student counts per class
    student_counts = dict(
        db.query(models.Student.class_id, func.count(models.Student.id))
        .filter(models.Student.is_active == True)
        .group_by(models.Student.class_id).all()
    )

    # Batch query fee structure amount per class
    fee_per_student = dict(
        db.query(models.FeeStructure.class_id, func.sum(models.FeeStructure.amount))
        .filter(models.FeeStructure.academic_year == ay)
        .group_by(models.FeeStructure.class_id).all()
    )

    # Batch query total collected per class
    total_collected = dict(
        db.query(models.FeePayment.class_id, func.sum(models.FeePayment.amount_paid))
        .filter(
            models.FeePayment.academic_year == ay,
            models.FeePayment.is_cancelled == False
        ).group_by(models.FeePayment.class_id).all()
    )

    results = []
    for c in classes:
        st_count = student_counts.get(c.id, 0)
        fee_per_st = Decimal(str(fee_per_student.get(c.id, 0) or 0))
        collected = Decimal(str(total_collected.get(c.id, 0) or 0))
        total_expected = fee_per_st * st_count
        pending_fees = max(Decimal("0"), total_expected - collected)

        out = schemas.ClassOut.from_orm(c)
        out.student_count = st_count
        out.pending_fees = float(pending_fees)
        results.append(out)

    return results


@router.post("/", response_model=schemas.ClassOut, dependencies=[Depends(require_role(["admin"]))])
def create_class(payload: schemas.ClassCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Class).filter(
        models.Class.name == payload.name,
        models.Class.section == payload.section
    ).first()
    if existing:
        raise HTTPException(400, "Class with this name and section already exists")
    cls = models.Class(**payload.dict())
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


@router.get("/{class_id}", response_model=schemas.ClassOut)
def get_class(class_id: int, db: Session = Depends(get_db)):
    cls = db.query(models.Class).filter(models.Class.id == class_id).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    return cls

@router.delete("/{class_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_class(class_id: int, db: Session = Depends(get_db)):
    cls = db.query(models.Class).filter(models.Class.id == class_id).first()
    if not cls:
        raise HTTPException(404, "Class not found")
    db.delete(cls)
    db.commit()
    return {"message": "Deleted"}


@router.get("/{class_id}/fees")
def get_class_fees(class_id: int, academic_year: Optional[str] = None, db: Session = Depends(get_db)):
    ay = academic_year or db.query(models.SchoolSettings.current_academic_year).scalar() or "2024-2025"
    
    students = db.query(models.Student).filter(
        models.Student.class_id == class_id, 
        models.Student.is_active == True
    ).order_by(models.Student.name).all()
    
    if not students:
        return []

    # Batch query term fees for this class
    fee_rows = db.query(models.FeeStructure.term, func.sum(models.FeeStructure.amount)).filter(
        models.FeeStructure.class_id == class_id,
        models.FeeStructure.academic_year == ay
    ).group_by(models.FeeStructure.term).all()

    term_fees_map = {}
    for term_val, amt in fee_rows:
        term_str = str(term_val.value if hasattr(term_val, "value") else term_val)
        term_fees_map[term_str] = Decimal(str(amt or 0))

    student_ids = [s.id for s in students]

    # Batch query payments for all students in this class
    payment_rows = db.query(
        models.FeePayment.student_id,
        models.FeePayment.term,
        func.sum(models.FeePayment.amount_paid)
    ).filter(
        models.FeePayment.student_id.in_(student_ids),
        models.FeePayment.academic_year == ay,
        models.FeePayment.is_cancelled == False
    ).group_by(models.FeePayment.student_id, models.FeePayment.term).all()

    paid_map = {}
    for sid, term_val, paid_amt in payment_rows:
        term_str = str(term_val.value if hasattr(term_val, "value") else term_val)
        paid_map[(sid, term_str)] = Decimal(str(paid_amt or 0))

    results = []
    for s in students:
        s_total = Decimal("0")
        s_paid = Decimal("0")
        terms_details = []

        for term in ["Term 1", "Term 2", "Term 3"]:
            t_fee = term_fees_map.get(term, Decimal("0"))
            t_paid = paid_map.get((s.id, term), Decimal("0"))

            s_total += t_fee
            s_paid += t_paid

            terms_details.append({
                "term": term,
                "total_fee": float(t_fee),
                "amount_paid": float(t_paid),
                "balance": float(t_fee - t_paid),
                "status": "Paid" if (t_fee - t_paid) <= 0 else "Pending"
            })

        results.append({
            "student_id": s.id,
            "admission_no": s.admission_no,
            "student_name": s.name,
            "parent_name": s.parent_name or "",
            "phone": s.phone or "",
            "total_fee": float(s_total),
            "amount_paid": float(s_paid),
            "balance": float(s_total - s_paid),
            "status": "Paid" if (s_total - s_paid) <= 0 else "Pending",
            "terms": terms_details
        })

    return results
