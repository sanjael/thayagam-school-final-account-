from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import require_role

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/", response_model=List[schemas.AuditLogOut])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "accountant", "principal"]))
):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(100).all()
    
    # Enrich with usernames
    results = []
    for log in logs:
        out = schemas.AuditLogOut.from_orm(log)
        out.username = log.user.username if log.user else "System"
        results.append(out)
        
    return results
