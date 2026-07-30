from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import verify_password, create_access_token, hash_password, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_access_token({"sub": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "must_change_password": user.must_change_password,
    }


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.hashed_password = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password changed successfully"}
