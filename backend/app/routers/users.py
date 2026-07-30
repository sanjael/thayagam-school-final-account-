import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import hash_password, require_role

router = APIRouter(prefix="/users", tags=["Users"])

ADMIN_ONLY = Depends(require_role(["admin"]))


def _generate_temp_password(length: int = 10) -> str:
    """Generate a random temporary password."""
    chars = string.ascii_letters + string.digits + "!@#$"
    # Ensure at least one of each character type
    pwd = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits),
        random.choice("!@#$"),
    ]
    pwd += [random.choice(chars) for _ in range(length - 4)]
    random.shuffle(pwd)
    return "".join(pwd)


@router.get("/", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), _=ADMIN_ONLY):
    return db.query(models.User).order_by(models.User.id).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(payload: schemas.CreateUserByAdmin, db: Session = Depends(get_db), _=ADMIN_ONLY):
    existing = db.query(models.User).filter(
        (models.User.username == payload.username) | (models.User.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    temp_password = _generate_temp_password()
    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(temp_password),
        role=payload.role,
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # Return temp password in plain text — shown once to admin
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "must_change_password": user.must_change_password,
        "temp_password": temp_password,
    }


@router.put("/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), _=ADMIN_ONLY):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role.value == "admin":
        raise HTTPException(status_code=400, detail="Cannot deactivate the admin account")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@router.put("/{user_id}/reset-password")
def reset_password(user_id: int, db: Session = Depends(get_db), _=ADMIN_ONLY):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    temp_password = _generate_temp_password()
    user.hashed_password = hash_password(temp_password)
    user.must_change_password = True
    db.commit()
    return {"temp_password": temp_password}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), _=ADMIN_ONLY):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role.value == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete the admin account")
    db.delete(user)
    db.commit()
