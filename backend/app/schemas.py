from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr
from app.models import UserRole, PaymentMode, Term


# ── Auth ────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    must_change_password: bool = False

class UserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr
    role: UserRole

class CreateUserByAdmin(BaseModel):
    username: str
    email: EmailStr
    role: UserRole

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    must_change_password: bool = False
    class Config:
        from_attributes = True



# ── Class ───────────────────────────────────────────────────
class ClassCreate(BaseModel):
    name: str
    section: Optional[str] = None

class ClassOut(BaseModel):
    id: int
    name: str
    section: Optional[str]
    student_count: Optional[int] = 0
    pending_fees: Optional[float] = 0.0
    class Config:
        from_attributes = True


# ── Student ─────────────────────────────────────────────────
class StudentCreate(BaseModel):
    admission_no: str
    name: str
    class_id: int
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    old_fee: Optional[float] = 0.0
    van_fee: Optional[float] = 0.0

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    class_id: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    old_fee: Optional[float] = None
    van_fee: Optional[float] = None

class StudentOut(BaseModel):
    id: int
    admission_no: str
    name: str
    class_id: int
    class_name: Optional[str] = None
    gender: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    is_active: bool
    old_fee: Optional[float] = 0.0
    van_fee: Optional[float] = 0.0
    created_at: Optional[datetime] = None
    pending_fees: Optional[float] = 0.0
    class Config:
        from_attributes = True


# ── Fee Structure ────────────────────────────────────────────
class FeeStructureCreate(BaseModel):
    class_id: int
    term: Term
    fee_type: str
    amount: float
    academic_year: str

class FeeStructureOut(BaseModel):
    id: int
    class_id: int
    class_name: Optional[str] = None
    term: str
    fee_type: str
    amount: float
    academic_year: str
    class Config:
        from_attributes = True


# ── Fee Payment ──────────────────────────────────────────────
class FeePaymentCreate(BaseModel):
    student_id: int
    term: str
    academic_year: str
    amount_paid: float
    payment_date: date
    payment_mode: str = "cash"
    fine: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    reference_no: Optional[str] = None
    notes: Optional[str] = None

class FeePaymentOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    admission_no: Optional[str] = None
    phone: Optional[str] = None
    class_name: Optional[str] = None
    term: str
    academic_year: str
    total_fee: float
    amount_paid: float
    balance: float
    payment_date: date
    payment_mode: str
    fine: float
    discount: float
    reference_no: Optional[str] = None
    is_cancelled: bool
    cancellation_reason: Optional[str] = None
    receipt_no: Optional[str] = None
    class Config:
        from_attributes = True


# ── School Settings ──────────────────────────────────────────
class SchoolSettingsUpdate(BaseModel):
    school_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    correspondent_name: Optional[str] = None
    principal_name: Optional[str] = None
    current_academic_year: Optional[str] = None
    current_term: Optional[str] = None

class SchoolSettingsOut(BaseModel):
    id: int
    school_name: str
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    logo_path: Optional[str]
    correspondent_name: Optional[str]
    principal_name: Optional[str]
    current_academic_year: str
    current_term: str = "Term 1"
    class Config:
        from_attributes = True


# ── Audit Log ────────────────────────────────────────────────
class AuditLogCreate(BaseModel):
    user_id: int
    action: str
    details: Optional[str] = None

class AuditLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    details: Optional[str]
    created_at: datetime
    username: Optional[str] = None
    class Config:
        from_attributes = True
