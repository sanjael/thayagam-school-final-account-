from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.auth import require_role

router = APIRouter(prefix="/students", tags=["Students"])


TERM_ORDER = ["Term 1", "Term 2", "Term 3"]

def _terms_up_to(current_term: str) -> list:
    try:
        idx = TERM_ORDER.index(current_term)
    except ValueError:
        idx = 0
    return TERM_ORDER[:idx + 1]


def _enrich(s: models.Student, db: Session = None, ay: str = None, active_terms: list = None) -> schemas.StudentOut:
    out = schemas.StudentOut.from_orm(s)
    if s.class_:
        out.class_name = f"{s.class_.name} - {s.class_.section}" if s.class_.section else s.class_.name
    else:
        out.class_name = None

    if db and ay:
        terms = active_terms or TERM_ORDER
        total_fee = db.query(func.sum(models.FeeStructure.amount)).filter(
            models.FeeStructure.class_id == s.class_id,
            models.FeeStructure.term.in_(terms),
            models.FeeStructure.academic_year == ay
        ).scalar() or 0
        total_fee = max(0.0, float(total_fee) + float(s.old_fee or 0) - float(s.discount or 0))

        search_terms = list(terms) + ["Old Fee"]
        total_paid = db.query(func.sum(models.FeePayment.amount_paid)).filter(
            models.FeePayment.student_id == s.id,
            models.FeePayment.term.in_(search_terms),
            models.FeePayment.academic_year == ay,
            models.FeePayment.is_cancelled == False
        ).scalar() or 0

        bal = float(total_fee) - float(total_paid)
        out.total_fees = total_fee
        out.pending_fees = bal if bal > 0 else 0.0

    return out


@router.get("/", response_model=List[schemas.StudentOut])
def get_students(
    search: Optional[str] = None,
    class_id: Optional[int] = None,
    gender: Optional[str] = None,
    status: Optional[str] = None,  # active | inactive | all
    db: Session = Depends(get_db),
):
    settings = db.query(models.SchoolSettings).first()
    ay = settings.current_academic_year if settings else "2024-2025"
    active_terms = _terms_up_to(settings.current_term if settings else "Term 1")

    q = db.query(models.Student).options(joinedload(models.Student.class_))
    if status == "active" or status is None:
        q = q.filter(models.Student.is_active == True)
    elif status == "inactive":
        q = q.filter(models.Student.is_active == False)

    if search and isinstance(search, str) and search.strip():
        q = q.filter(
            (models.Student.name.ilike(f"%{search}%")) |
            (models.Student.admission_no.ilike(f"%{search}%")) |
            (models.Student.phone.ilike(f"%{search}%"))
        )
    if class_id and isinstance(class_id, int):
        q = q.filter(models.Student.class_id == class_id)
    if gender and isinstance(gender, str) and gender in ("male", "female", "other"):
        q = q.filter(models.Student.gender == gender)

    students = q.order_by(models.Student.name).all()
    if not students:
        return []

    # Batch query fee structures per class (1 query)
    fee_rows = db.query(models.FeeStructure.class_id, func.sum(models.FeeStructure.amount)).filter(
        models.FeeStructure.term.in_(active_terms),
        models.FeeStructure.academic_year == ay
    ).group_by(models.FeeStructure.class_id).all()
    fee_map = {cid: float(amt or 0) for cid, amt in fee_rows}

    # Batch query payments per student (1 query)
    student_ids = [s.id for s in students]
    payment_rows = db.query(
        models.FeePayment.student_id,
        func.sum(models.FeePayment.amount_paid)
    ).filter(
        models.FeePayment.student_id.in_(student_ids),
        models.FeePayment.term.in_(list(active_terms) + ["Old Fee"]),
        models.FeePayment.academic_year == ay,
        models.FeePayment.is_cancelled == False
    ).group_by(models.FeePayment.student_id).all()
    paid_map = {sid: float(amt or 0) for sid, amt in payment_rows}

    results = []
    for s in students:
        out = schemas.StudentOut.from_orm(s)
        if s.class_:
            out.class_name = f"{s.class_.name} - {s.class_.section}" if s.class_.section else s.class_.name
        else:
            out.class_name = None

        total_fee = max(0.0, fee_map.get(s.class_id, 0.0) + float(s.old_fee or 0) - float(s.discount or 0))
        out.total_fees = total_fee
        total_paid = paid_map.get(s.id, 0.0)
        bal = total_fee - total_paid
        out.pending_fees = bal if bal > 0 else 0.0
        results.append(out)

    return results


@router.get("/{student_id}", response_model=schemas.StudentOut)
def get_student(student_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(404, "Student not found")
    return _enrich(s)


@router.post("/", response_model=schemas.StudentOut, dependencies=[Depends(require_role(["admin", "accountant"]))])
def create_student(payload: schemas.StudentCreate, db: Session = Depends(get_db)):
    if db.query(models.Student).filter(models.Student.admission_no == payload.admission_no).first():
        raise HTTPException(400, "Admission number already exists")
    s = models.Student(**payload.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    return _enrich(s)


@router.put("/{student_id}", response_model=schemas.StudentOut, dependencies=[Depends(require_role(["admin", "accountant"]))])
def update_student(student_id: int, payload: schemas.StudentUpdate, db: Session = Depends(get_db)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(404, "Student not found")
    for k, v in payload.dict(exclude_none=True).items():
        setattr(s, k, v)
    
    # Audit Log
    current_user = db.query(models.User).filter(models.User.id == getattr(db, "_current_user_id", 1)).first() # fallback if not injected
    
    db.commit()
    db.refresh(s)
    return _enrich(s)


@router.delete("/{student_id}")
def delete_student(
    student_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(404, "Student not found")
    s.is_active = False
    
    audit = models.AuditLog(
        user_id=current_user.id,
        action="Delete Student",
        details=f"Deactivated student {s.name} ({s.admission_no})"
    )
    db.add(audit)
    
    db.commit()
    return {"message": "Student deactivated"}
