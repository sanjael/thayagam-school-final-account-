from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import require_role
import os, shutil

router = APIRouter(prefix="/settings", tags=["Settings"])
UPLOAD_DIR = "static/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/", response_model=schemas.SchoolSettingsOut)
def get_settings(db: Session = Depends(get_db)):
    s = db.query(models.SchoolSettings).first()
    if not s:
        raise HTTPException(404, "Settings not configured")
    return s


@router.put("/", response_model=schemas.SchoolSettingsOut, dependencies=[Depends(require_role(["admin"]))])
def update_settings(payload: schemas.SchoolSettingsUpdate, db: Session = Depends(get_db)):
    s = db.query(models.SchoolSettings).first()
    if not s:
        s = models.SchoolSettings(school_name="School")
        db.add(s)
    for k, v in payload.dict(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


import base64

@router.post("/logo", dependencies=[Depends(require_role(["admin"]))])
def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ("png", "jpg", "jpeg"):
        raise HTTPException(400, "Only PNG/JPG allowed")
    
    file_path = os.path.join(UPLOAD_DIR, f"logo.{ext}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    s = db.query(models.SchoolSettings).first()
    if not s:
        s = models.SchoolSettings(school_name="School")
        db.add(s)
    
    s.logo_path = file_path.replace("\\", "/")
    db.commit()
    db.refresh(s)
    return {"message": "Logo uploaded", "logo_path": s.logo_path}

from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import tempfile
from datetime import datetime

@router.get("/backup/pdf")
def get_backup_pdf(type: str = "daily", date: str = "", db: Session = Depends(get_db)):
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors
    
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    
    doc = SimpleDocTemplate(path, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    title_text = "Thayagam Academy - Detailed Backup Report"
    if type == "monthly":
        title_text += " (Monthly)"
    elif type == "custom":
        title_text += f" ({date})"
    else:
        title_text += " (Daily)"
        
    elements.append(Paragraph(title_text, styles['Title']))
    elements.append(Spacer(1, 15))
    elements.append(Paragraph(f"Generated On: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Table data
    data = [["Admn No", "Student Name", "Class", "Total Paid", "Total Pending"]]
    
    from app.models import Student, FeePayment, FeeStructure
    students = db.query(Student).all()
    
    total_school_paid = 0
    total_school_pending = 0
    
    for s in students:
        payments = db.query(FeePayment).filter(FeePayment.student_id == s.id, FeePayment.is_cancelled == False).all()
        total_paid = sum(p.amount_paid for p in payments)
        
        structures = db.query(FeeStructure).filter(FeeStructure.class_id == s.class_id).all()
        total_expected = sum(st.amount for st in structures)
        
        pending = total_expected - total_paid
        
        total_school_paid += total_paid
        total_school_pending += pending
        
        class_name = s.class_.name if s.class_ else "-"
        if s.class_ and s.class_.section:
            class_name += f" {s.class_.section}"
            
        data.append([
            s.admission_no,
            s.name,
            class_name,
            f"{total_paid:,.2f}",
            f"{pending:,.2f}"
        ])
        
    # Append total row
    data.append([
        "TOTAL",
        "",
        "",
        f"{total_school_paid:,.2f}",
        f"{total_school_pending:,.2f}"
    ])
        
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f59e0b")), # amber-500
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#334155")), # slate-700
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.whitesmoke),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    
    elements.append(table)
    
    doc.build(elements)
    
    return FileResponse(path, media_type="application/pdf", filename=f"Thayagam_Backup_{type}.pdf")
