import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Student, FeePayment, FeeStructure
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
import tempfile
from datetime import datetime

db = SessionLocal()

def generate_report():
    path = "backup_test.pdf"
    doc = SimpleDocTemplate(path, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    elements.append(Paragraph("System Backup - Student Fee Report", styles['Title']))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Generated On: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Table data
    data = [["Admission No", "Student Name", "Class", "Total Paid", "Total Pending"]]
    
    students = db.query(Student).all()
    for s in students:
        # Calculate total paid from fee payments
        payments = db.query(FeePayment).filter(FeePayment.student_id == s.id, FeePayment.is_cancelled == False).all()
        total_paid = sum(p.amount_paid for p in payments)
        
        # Calculate total fees from fee structure for this student's class
        # Assuming current_academic_year is "2024-2025"
        structures = db.query(FeeStructure).filter(FeeStructure.class_id == s.class_id).all()
        total_expected = sum(st.amount for st in structures)
        
        pending = total_expected - total_paid
        
        class_name = s.class_.name if s.class_ else "-"
        if s.class_ and s.class_.section:
            class_name += f" {s.class_.section}"
            
        data.append([
            s.admission_no,
            s.name,
            class_name,
            f"Rs {total_paid}",
            f"Rs {pending}"
        ])
        
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    
    doc.build(elements)
    print("Report generated successfully.")

generate_report()
