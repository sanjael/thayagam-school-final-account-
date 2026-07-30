from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.auth import require_role

router = APIRouter(prefix="/fee-structure", tags=["Fee Structure"])


def _enrich(f: models.FeeStructure) -> schemas.FeeStructureOut:
    out = schemas.FeeStructureOut.from_orm(f)
    out.class_name = f.class_.name if f.class_ else None
    return out


@router.get("/", response_model=List[schemas.FeeStructureOut])
def get_fee_structure(
    class_id: Optional[int] = Query(None),
    academic_year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.FeeStructure)
    if class_id:
        q = q.filter(models.FeeStructure.class_id == class_id)
    if academic_year:
        q = q.filter(models.FeeStructure.academic_year == academic_year)
    return [_enrich(f) for f in q.all()]


@router.post("/", response_model=schemas.FeeStructureOut)
def create_fee_structure(
    payload: schemas.FeeStructureCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    fs = models.FeeStructure(**payload.dict())
    db.add(fs)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(400, "Fee structure entry already exists for this class/term/type/year")
    db.refresh(fs)
    
    audit = models.AuditLog(
        user_id=current_user.id,
        action="Create Fee Structure",
        details=f"Created fee for Class ID {fs.class_id} Term {fs.term} ({fs.fee_type}: {fs.amount})"
    )
    db.add(audit)
    db.commit()
    
    return _enrich(fs)


@router.delete("/{fee_id}")
def delete_fee_structure(
    fee_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    fs = db.query(models.FeeStructure).filter(models.FeeStructure.id == fee_id).first()
    if not fs:
        raise HTTPException(404, "Not found")
    db.delete(fs)
    
    audit = models.AuditLog(
        user_id=current_user.id,
        action="Delete Fee Structure",
        details=f"Deleted fee ID {fee_id}"
    )
    db.add(audit)
    
    db.commit()
    return {"message": "Deleted"}
