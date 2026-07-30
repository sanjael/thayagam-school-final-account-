from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    Enum, Text, DECIMAL, ForeignKey, UniqueConstraint, func
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    admin       = "admin"
    accountant  = "accountant"
    principal   = "principal"


class PaymentMode(str, enum.Enum):
    cash   = "cash"
    online = "online"
    cheque = "cheque"
    dd     = "dd"
    upi    = "upi"
    card   = "card"


class Term(str, enum.Enum):
    term1 = "Term 1"
    term2 = "Term 2"
    term3 = "Term 3"


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(100), unique=True, nullable=False)
    email           = Column(String(150), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(Enum(UserRole), nullable=False, default=UserRole.accountant)
    is_active            = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    created_at           = Column(DateTime, server_default=func.now())


class OTPVerification(Base):
    __tablename__ = "otp_verifications"
    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(150), unique=True, nullable=False, index=True)
    otp        = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Class(Base):
    __tablename__ = "classes"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(50), nullable=False)
    section    = Column(String(10))
    created_at = Column(DateTime, server_default=func.now())

    students      = relationship("Student",      back_populates="class_")
    fee_structure = relationship("FeeStructure", back_populates="class_")

    __table_args__ = (
        UniqueConstraint('name', 'section', name='uq_class_name_section'),
    )


class Student(Base):
    __tablename__ = "students"
    id           = Column(Integer, primary_key=True, index=True)
    admission_no = Column(String(50), unique=True, nullable=False)
    name         = Column(String(150), nullable=False, index=True)
    class_id     = Column(Integer, ForeignKey("classes.id"), nullable=False)
    gender       = Column(Enum("male", "female", "other", name="gender_enum"))
    dob          = Column(Date)
    parent_name  = Column(String(150))
    phone        = Column(String(15))
    address      = Column(Text)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, server_default=func.now())

    class_    = relationship("Class",       back_populates="students")
    payments  = relationship("FeePayment",  back_populates="student")


class FeeStructure(Base):
    __tablename__ = "fee_structure"
    __table_args__ = (
        UniqueConstraint("class_id", "term", "fee_type", "academic_year",
                         name="uq_fee_structure"),
    )
    id            = Column(Integer, primary_key=True, index=True)
    class_id      = Column(Integer, ForeignKey("classes.id"), nullable=False)
    term          = Column(Enum(Term), nullable=False)
    fee_type      = Column(String(100), nullable=False)
    amount        = Column(DECIMAL(10, 2), nullable=False)
    academic_year = Column(String(20), nullable=False)
    created_at    = Column(DateTime, server_default=func.now())

    class_ = relationship("Class", back_populates="fee_structure")


class FeePayment(Base):
    __tablename__ = "fee_payments"
    id            = Column(Integer, primary_key=True, index=True)
    student_id    = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id      = Column(Integer, ForeignKey("classes.id"), nullable=False)
    term          = Column(Enum(Term), nullable=False)
    academic_year = Column(String(20), nullable=False)
    total_fee     = Column(DECIMAL(10, 2), nullable=False)
    amount_paid   = Column(DECIMAL(10, 2), nullable=False)
    balance       = Column(DECIMAL(10, 2), nullable=False)
    payment_date  = Column(Date, nullable=False)
    payment_mode  = Column(Enum(PaymentMode), default=PaymentMode.cash)
    collected_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    fine          = Column(DECIMAL(10, 2), default=0)
    discount      = Column(DECIMAL(10, 2), default=0)
    reference_no  = Column(String(100), nullable=True)
    is_cancelled  = Column(Boolean, default=False)
    cancellation_reason = Column(Text, nullable=True)
    notes         = Column(Text)
    created_at    = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="payments")
    receipt = relationship("Receipt", back_populates="payment", uselist=False)


class Receipt(Base):
    __tablename__ = "receipts"
    id         = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(50), unique=True, nullable=False)
    payment_id = Column(Integer, ForeignKey("fee_payments.id"), nullable=False)
    issued_at  = Column(DateTime, server_default=func.now())

    payment = relationship("FeePayment", back_populates="receipt")


class SchoolSettings(Base):
    __tablename__ = "school_settings"
    id                   = Column(Integer, primary_key=True, index=True)
    school_name          = Column(String(200), nullable=False)
    address              = Column(Text)
    phone                = Column(String(20))
    email                = Column(String(150))
    logo_path            = Column(String(500))
    correspondent_name   = Column(String(150))
    principal_name       = Column(String(150))
    current_academic_year = Column(String(20), default="2024-2025")
    current_term          = Column(String(20), default="Term 1")
    updated_at            = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    action      = Column(String(200), nullable=False)
    details     = Column(Text)
    created_at  = Column(DateTime, server_default=func.now())

    user = relationship("User")
