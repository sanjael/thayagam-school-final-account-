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
def get_classes(academic_year: Optional[str] = Query(None), db: Session = Depends(get_db)):
    ay = academic_year or db.query(models.SchoolSettings.current_academic_year).scalar() or "2024-2025"
    classes = db.query(models.Class).order_by(models.Class.name).all()
    results = []
    
    for c in classes:
        # Get active student count
        student_count = db.query(func.count(models.Student.id)).filter(
            models.Student.class_id == c.id,
            models.Student.is_active == True
        ).scalar() or 0
        
        # Calculate pending fees
        class_fee_per_student = db.query(func.sum(models.FeeStructure.amount)).filter(
            models.FeeStructure.class_id == c.id,
            models.FeeStructure.academic_year == ay
        ).scalar() or Decimal("0")
        
        total_expected = class_fee_per_student * student_count
        
        collected = db.query(func.sum(models.FeePayment.amount_paid)).filter(
            models.FeePayment.class_id == c.id,
            models.FeePayment.academic_year == ay,
            models.FeePayment.is_cancelled == False
        ).scalar() or Decimal("0")
        
        pending_fees = max(Decimal("0"), total_expected - collected)
        
        out = schemas.ClassOut.from_orm(c)
        out.student_count = student_count
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

from fastapi import Query
from sqlalchemy import func

@router.get("/{class_id}/fees")
def get_class_fees(class_id: int, academic_year: Optional[str] = Query(None), db: Session = Depends(get_db)):
    ay = academic_year or db.query(models.SchoolSettings.current_academic_year).scalar() or "2024-2025"
    
    students = db.query(models.Student).filter(
        models.Student.class_id == class_id, 
        models.Student.is_active == True
    ).order_by(models.Student.name).all()
    
    results = []
    for s in students:
        s_total = Decimal("0")
        s_paid = Decimal("0")
        
        terms_details = []
        for term in ["Term 1", "Term 2", "Term 3"]:
            term_fee = db.query(func.sum(models.FeeStructure.amount)).filter(
                models.FeeStructure.class_id      == class_id,
                models.FeeStructure.term          == term,
                models.FeeStructure.academic_year == ay
            ).scalar() or Decimal("0")
            
            term_paid = db.query(func.sum(models.FeePayment.amount_paid)).filter(
                models.FeePayment.student_id      == s.id,
                models.FeePayment.term            == term,
                models.FeePayment.academic_year   == ay,
                models.FeePayment.is_cancelled    == False
            ).scalar() or Decimal("0")
            
            s_total += term_fee
            s_paid += term_paid
            
            terms_details.append({
                "term": term,
                "total_fee": float(term_fee),
                "amount_paid": float(term_paid),
                "balance": float(term_fee - term_paid),
                "status": "Paid" if (term_fee - term_paid) <= 0 else "Pending"
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
