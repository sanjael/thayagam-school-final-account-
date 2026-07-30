from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
import io, os


def generate_receipt_pdf(payment: dict, settings: dict) -> bytes:
    """
    payment keys: receipt_no, student_name, admission_no, class_name,
                  term, academic_year, total_fee, amount_paid, balance,
                  payment_date, payment_mode
    settings keys: school_name, address, phone, logo_path,
                   correspondent_name, principal_name
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        rightMargin=15*mm, leftMargin=15*mm,
        topMargin=10*mm, bottomMargin=10*mm
    )

    styles = getSampleStyleSheet()
    center  = ParagraphStyle("center",  parent=styles["Normal"], alignment=TA_CENTER)
    right   = ParagraphStyle("right",   parent=styles["Normal"], alignment=TA_RIGHT)
    heading = ParagraphStyle("heading", parent=styles["Heading1"], alignment=TA_CENTER, fontSize=16, textColor=colors.HexColor("#1e293b"))
    sub     = ParagraphStyle("sub",     parent=styles["Normal"],  alignment=TA_CENTER, fontSize=9, textColor=colors.HexColor("#64748b"))

    elements = []

    # ── Header ─────────────────────────────────────────
    import base64
    logo_path = settings.get("logo_path", "")
    if logo_path.startswith("data:image"):
        try:
            b64_str = logo_path.split(",")[1]
            img_data = base64.b64decode(b64_str)
            img_io = io.BytesIO(img_data)
            elements.append(Image(img_io, width=18*mm, height=18*mm))
        except:
            pass
    elif logo_path and os.path.exists(logo_path):
        elements.append(Image(logo_path, width=18*mm, height=18*mm))

    elements.append(Paragraph(settings.get("school_name", "School"), heading))
    elements.append(Paragraph(settings.get("address", ""), sub))
    elements.append(Paragraph(f"Phone: {settings.get('phone', '')}", sub))
    elements.append(Spacer(1, 4*mm))

    elements.append(Spacer(1, 4*mm))

    # ── Title ───────────────────────────────────────────
    title_style = ParagraphStyle("title", parent=styles["Normal"], alignment=TA_CENTER, fontSize=12, textColor=colors.HexColor("#f59e0b"), fontName="Helvetica-Bold")
    elements.append(Paragraph("OFFICIAL FEE RECEIPT", title_style))
    elements.append(Spacer(1, 5*mm))

    # ── Receipt Info ────────────────────────────────────
    import datetime
    current_time = datetime.datetime.now().strftime("%I:%M %p")
    
    # Fix term enum string formatting
    term_val = getattr(payment.get("term"), "value", str(payment.get("term")))
    if "term1" in term_val.lower(): term_val = "Term 1"
    elif "term2" in term_val.lower(): term_val = "Term 2"
    elif "term3" in term_val.lower(): term_val = "Term 3"

    info_data = [
        ["Receipt No:", payment["receipt_no"],  "Date/Time:", f"{str(payment['payment_date'])} {current_time}"],
        ["Academic Year:", payment["academic_year"], "Term:", term_val],
    ]
    info_table = Table(info_data, colWidths=[30*mm, 45*mm, 20*mm, 35*mm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("TEXTCOLOR", (0,0), (0,-1), colors.HexColor("#64748b")),
        ("TEXTCOLOR", (2,0), (2,-1), colors.HexColor("#64748b")),
        ("FONTNAME", (1,0), (1,-1), "Helvetica-Bold"),
        ("FONTNAME", (3,0), (3,-1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 5*mm))

    # ── Student Info ─────────────────────────────────────
    stu_data = [
        ["Student Name:", payment["student_name"].upper()],
        ["Admission No:", payment["admission_no"]],
        ["Class/Grade:", payment["class_name"]],
    ]
    stu_table = Table(stu_data, colWidths=[35*mm, 95*mm])
    stu_table.setStyle(TableStyle([
        ("FONTSIZE", (0,0), (-1,-1), 10),
        ("TEXTCOLOR", (0,0), (0,-1), colors.HexColor("#64748b")),
        ("FONTNAME", (1,0), (1,-1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    elements.append(stu_table)
    elements.append(Spacer(1, 6*mm))

    # ── Fee Table ────────────────────────────────────────
    fee_data = [
        ["Description", "Amount (₹)"],
        ["Total Term Fee", f"{float(payment['total_fee']):,.2f}"],
        ["Amount Paid",    f"{float(payment['amount_paid']):,.2f}"],
        ["Outstanding Balance", f"{float(payment['balance']):,.2f}"],
        ["Payment Mode",   payment["payment_mode"].upper()],
    ]
    fee_table = Table(fee_data, colWidths=[95*mm, 35*mm])
    fee_table.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR",   (0,0), (-1,0), colors.white),
        ("FONTSIZE",    (0,0), (-1,-1), 10),
        ("ALIGN",       (1,0), (1,-1), "RIGHT"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID",        (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTNAME",    (0,3), (-1,3), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("TEXTCOLOR",   (1,3), (1,3),
         colors.HexColor("#10b981") if float(payment['balance']) == 0 else colors.HexColor("#ef4444")),
    ]))
    elements.append(fee_table)
    elements.append(Spacer(1, 8*mm))

    # ── Signatures ───────────────────────────────────────
    sig_data = [[
        Paragraph(f"<b>{settings.get('correspondent_name','Correspondent')}</b><br/>Correspondent", center),
        Paragraph("<b>Cashier</b>", center),
        Paragraph(f"<b>{settings.get('principal_name','Principal')}</b><br/>Principal", center),
    ]]
    sig_table = Table(sig_data, colWidths=[43*mm, 43*mm, 44*mm])
    sig_table.setStyle(TableStyle([
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ALIGN",    (0,0), (-1,-1), "CENTER"),
        ("VALIGN",   (0,0), (-1,-1), "BOTTOM"),
        ("TOPPADDING", (0,0), (-1,-1), 15),
        ("LINEABOVE", (0,0), (-1,0), 0.5, colors.grey),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
