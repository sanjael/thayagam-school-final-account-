from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.receipt_generator import generate_receipt_pdf
import io

router = APIRouter(prefix="/receipts", tags=["Receipts"])


@router.get("/{payment_id}/pdf")
def download_receipt(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(models.FeePayment).filter(models.FeePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if not payment.receipt:
        raise HTTPException(404, "Receipt not generated yet")

    s = db.query(models.SchoolSettings).first()
    settings = {
        "school_name":        s.school_name        if s else "School",
        "address":            s.address             if s else "",
        "phone":              s.phone               if s else "",
        "logo_path":          s.logo_path           if s else "",
        "correspondent_name": s.correspondent_name  if s else "Correspondent",
        "principal_name":     s.principal_name      if s else "Principal",
    }
    pay_data = {
        "receipt_no":    payment.receipt.receipt_no,
        "student_name":  payment.student.name if payment.student else "",
        "admission_no":  payment.student.admission_no if payment.student else "",
        "class_name":    payment.student.class_.name if payment.student and payment.student.class_ else "",
        "term":          payment.term,
        "academic_year": payment.academic_year,
        "total_fee":     payment.total_fee,
        "amount_paid":   payment.amount_paid,
        "balance":       payment.balance,
        "payment_date":  payment.payment_date,
        "payment_mode":  payment.payment_mode,
    }
    pdf_bytes = generate_receipt_pdf(pay_data, settings)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=receipt_{payment.receipt.receipt_no}.pdf"}
    )
