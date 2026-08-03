from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from decimal import Decimal
import datetime
from sqlalchemy import extract
from app.database import get_db
from app import models

router = APIRouter(prefix="/reports", tags=["Reports"])

TERM_ORDER = ["Term 1", "Term 2", "Term 3"]

def terms_up_to(current_term: str) -> list:
    """Return all active terms."""
    return TERM_ORDER


@router.get("/summary")
def get_summary(academic_year: Optional[str] = Query(None), db: Session = Depends(get_db)):
    settings = db.query(models.SchoolSettings).first()
    if academic_year:
        ay = academic_year
    else:
        latest_fs = db.query(models.FeeStructure.academic_year).order_by(models.FeeStructure.id.desc()).first()
        ay = latest_fs[0] if latest_fs else (settings.current_academic_year if settings else "2026-2027")
        
    active_terms = ["Term 1", "Term 2", "Term 3"]
    today = datetime.date.today()

    # Run simple scalar queries (fast)
    total_students = db.query(func.count(models.Student.id)).filter(models.Student.is_active == True).scalar() or 0
    total_collected = db.query(func.sum(models.FeePayment.amount_paid)).filter(
        models.FeePayment.academic_year == ay,
        models.FeePayment.is_cancelled == False
    ).scalar() or 0
    today_collected = db.query(func.sum(models.FeePayment.amount_paid)).filter(
        models.FeePayment.payment_date == today,
        models.FeePayment.is_cancelled == False
    ).scalar() or 0
    first_of_month = today.replace(day=1)
    month_collected = db.query(func.sum(models.FeePayment.amount_paid)).filter(
        models.FeePayment.payment_date >= first_of_month,
        models.FeePayment.payment_date <= today,
        models.FeePayment.is_cancelled == False
    ).scalar() or 0
    total_receipts = db.query(func.count(models.FeePayment.id)).filter(
        models.FeePayment.academic_year == ay,
        models.FeePayment.is_cancelled == False
    ).scalar() or 0

    # Calculate total balance: load only (id, class_id, old_fee) columns — not full Student objects
    class_ids_q = db.query(models.Student.class_id).filter(models.Student.is_active == True).distinct().all()
    class_ids = [r[0] for r in class_ids_q if r[0]]
    fee_rows = db.query(
        models.FeeStructure.class_id,
        models.FeeStructure.term,
        func.sum(models.FeeStructure.amount)
    ).filter(
        models.FeeStructure.class_id.in_(class_ids),
        models.FeeStructure.academic_year == ay
    ).group_by(models.FeeStructure.class_id, models.FeeStructure.term).all()
    fee_map = {(cid, term): Decimal(str(amt or 0)) for cid, term, amt in fee_rows}

    student_class_rows = db.query(
        models.Student.id,
        models.Student.class_id,
        models.Student.old_fee,
        models.Student.discount
    ).filter(models.Student.is_active == True).all()

    student_ids = [r[0] for r in student_class_rows]
    payment_rows = db.query(
        models.FeePayment.student_id,
        models.FeePayment.term,
        func.sum(models.FeePayment.amount_paid)
    ).filter(
        models.FeePayment.student_id.in_(student_ids),
        models.FeePayment.academic_year == ay,
        models.FeePayment.is_cancelled == False
    ).group_by(models.FeePayment.student_id, models.FeePayment.term).all()
    paid_map = {(sid, term): Decimal(str(amt or 0)) for sid, term, amt in payment_rows}

    total_balance = Decimal("0")
    for sid, cid, old_fee, discount in student_class_rows:
        student_bal = Decimal("0")
        for term in active_terms:
            total_fee = fee_map.get((cid, term), Decimal("0"))
            if total_fee > 0:
                paid = paid_map.get((sid, term), Decimal("0"))
                bal = total_fee - paid
                if bal > 0:
                    student_bal += bal
        if old_fee and old_fee > 0:
            paid = paid_map.get((sid, "Old Fee"), Decimal("0"))
            bal = Decimal(str(old_fee)) - paid
            if bal > 0:
                student_bal += bal
        
        student_bal = max(Decimal("0"), student_bal - Decimal(str(discount or 0)))
        total_balance += student_bal

    return {
        "total_students":   total_students,
        "total_collected":  float(total_collected),
        "today_collected":  float(today_collected),
        "month_collected":  float(month_collected),
        "total_balance":    float(total_balance),
        "total_receipts":   total_receipts,
        "academic_year":    ay,
    }


@router.get("/pending")
def get_pending(academic_year: Optional[str] = Query(None), class_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    settings = db.query(models.SchoolSettings).first()
    if academic_year:
        ay = academic_year
    else:
        latest_fs = db.query(models.FeeStructure.academic_year).order_by(models.FeeStructure.id.desc()).first()
        ay = latest_fs[0] if latest_fs else (settings.current_academic_year if settings else "2026-2027")

    active_terms = ["Term 1", "Term 2", "Term 3"]

    students_q = db.query(models.Student).options(joinedload(models.Student.class_)).filter(models.Student.is_active == True)
    if class_id:
        students_q = students_q.filter(models.Student.class_id == class_id)
    students = students_q.all()

    if not students:
        return []

    # Batch query fee structures: (class_id, term) -> sum(amount)
    class_ids = list({s.class_id for s in students if s.class_id})
    fee_rows = db.query(
        models.FeeStructure.class_id,
        models.FeeStructure.term,
        func.sum(models.FeeStructure.amount)
    ).filter(
        models.FeeStructure.class_id.in_(class_ids),
        models.FeeStructure.academic_year == ay
    ).group_by(models.FeeStructure.class_id, models.FeeStructure.term).all()
    fee_map = {(cid, term): Decimal(str(amt or 0)) for cid, term, amt in fee_rows}

    # Batch query payments: (student_id, term) -> sum(amount_paid)
    student_ids = [s.id for s in students]
    payment_rows = db.query(
        models.FeePayment.student_id,
        models.FeePayment.term,
        func.sum(models.FeePayment.amount_paid)
    ).filter(
        models.FeePayment.student_id.in_(student_ids),
        models.FeePayment.academic_year == ay,
        models.FeePayment.is_cancelled == False
    ).group_by(models.FeePayment.student_id, models.FeePayment.term).all()
    paid_map = {(sid, term): Decimal(str(amt or 0)) for sid, term, amt in payment_rows}

    results = []
    for s in students:
        remaining_discount = Decimal(str(s.discount or 0))
        for term in active_terms:
            total_fee = fee_map.get((s.class_id, term), Decimal("0"))
            if total_fee == 0:
                continue
            total_paid = paid_map.get((s.id, term), Decimal("0"))
            balance = total_fee - total_paid
            if balance > 0:
                if remaining_discount > 0:
                    deduct = min(balance, remaining_discount)
                    balance -= deduct
                    remaining_discount -= deduct
                if balance > 0:
                    results.append({
                        "student_id":   s.id,
                        "student_name": s.name,
                        "admission_no": s.admission_no,
                        "class":        s.class_.name if s.class_ else "",
                        "term":         term,
                        "total_fee":    float(total_fee),
                        "amount_paid":  float(total_paid),
                        "balance":      float(balance),
                        "phone":        s.phone or "",
                    })
        if s.old_fee and s.old_fee > 0:
            total_paid = paid_map.get((s.id, "Old Fee"), Decimal("0"))
            balance = s.old_fee - total_paid
            if balance > 0:
                if remaining_discount > 0:
                    deduct = min(balance, remaining_discount)
                    balance -= deduct
                    remaining_discount -= deduct
                if balance > 0:
                    results.append({
                        "student_id":   s.id,
                        "student_name": s.name,
                        "admission_no": s.admission_no,
                        "class":        s.class_.name if s.class_ else "",
                        "term":         "Old Fee",
                        "total_fee":    float(s.old_fee),
                        "amount_paid":  float(total_paid),
                        "balance":      float(balance),
                        "phone":        s.phone or "",
                    })
    return results


@router.get("/student-fee-breakdown/{student_id}")
def student_fee_breakdown(student_id: int, db: Session = Depends(get_db)):
    """Returns a per-term fee breakdown for a student — used in the click-to-expand modal."""
    settings = db.query(models.SchoolSettings).first()
    ay = settings.current_academic_year if settings else "2024-2025"
    active_terms = terms_up_to(settings.current_term if settings else "Term 1")

    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        return {"error": "Student not found"}

    breakdown = []
    total_pending = Decimal("0")
    for term in active_terms:
        total_fee = db.query(func.sum(models.FeeStructure.amount)).filter(
            models.FeeStructure.class_id      == s.class_id,
            models.FeeStructure.term          == term,
            models.FeeStructure.academic_year == ay
        ).scalar() or Decimal("0")

        total_paid = db.query(func.sum(models.FeePayment.amount_paid)).filter(
            models.FeePayment.student_id      == s.id,
            models.FeePayment.term            == term,
            models.FeePayment.academic_year   == ay,
            models.FeePayment.is_cancelled    == False
        ).scalar() or Decimal("0")

        balance = total_fee - total_paid
        if balance < 0:
            balance = Decimal("0")
        total_pending += balance

        # Query payments for this term
        payments_q = db.query(models.FeePayment).filter(
            models.FeePayment.student_id      == s.id,
            models.FeePayment.term            == term,
            models.FeePayment.academic_year   == ay,
            models.FeePayment.is_cancelled    == False
        ).order_by(models.FeePayment.payment_date.desc()).all()
        
        term_payments = [{
            "id": p.id,
            "amount_paid": float(p.amount_paid),
            "payment_date": str(p.payment_date),
            "payment_mode": p.payment_mode.value if hasattr(p.payment_mode, 'value') else str(p.payment_mode),
            "receipt_no": p.receipt.receipt_no if p.receipt else f"REC-{p.id}",
            "fine": float(p.fine or 0),
            "discount": float(p.discount or 0),
            "notes": p.notes or ""
        } for p in payments_q]

        breakdown.append({
            "term":       term,
            "total_fee":  float(total_fee),
            "paid":       float(total_paid),
            "balance":    float(balance),
            "status":     "Paid" if balance == 0 and total_fee > 0 else ("Pending" if total_fee > 0 else "No Fee Set"),
            "payments":   term_payments
        })

    if s.old_fee and s.old_fee > 0:
        total_paid = db.query(func.sum(models.FeePayment.amount_paid)).filter(
            models.FeePayment.student_id      == s.id,
            models.FeePayment.term            == "Old Fee",
            models.FeePayment.academic_year   == ay,
            models.FeePayment.is_cancelled    == False
        ).scalar() or Decimal("0")

        balance = s.old_fee - total_paid
        if balance < 0:
            balance = Decimal("0")
        total_pending += balance

        # Query payments for Old Fee
        payments_q = db.query(models.FeePayment).filter(
            models.FeePayment.student_id      == s.id,
            models.FeePayment.term            == "Old Fee",
            models.FeePayment.academic_year   == ay,
            models.FeePayment.is_cancelled    == False
        ).order_by(models.FeePayment.payment_date.desc()).all()
        
        term_payments = [{
            "id": p.id,
            "amount_paid": float(p.amount_paid),
            "payment_date": str(p.payment_date),
            "payment_mode": p.payment_mode.value if hasattr(p.payment_mode, 'value') else str(p.payment_mode),
            "receipt_no": p.receipt.receipt_no if p.receipt else f"REC-{p.id}",
            "fine": float(p.fine or 0),
            "discount": float(p.discount or 0),
            "notes": p.notes or ""
        } for p in payments_q]

        breakdown.append({
            "term":       "Old Fee",
            "total_fee":  float(s.old_fee),
            "paid":       float(total_paid),
            "balance":    float(balance),
            "status":     "Paid" if balance == 0 else "Pending",
            "payments":   term_payments
        })

    return {
        "student_id":    s.id,
        "student_name":  s.name,
        "admission_no":  s.admission_no,
        "class_name":    s.class_.name if s.class_ else "",
        "academic_year": ay,
        "current_term":  settings.current_term if settings else "Term 1",
        "total_pending": float(max(Decimal("0"), total_pending - Decimal(str(s.discount or 0)))),
        "discount":      float(s.discount or 0),
        "discount_reason": s.discount_reason or "",
        "breakdown":     breakdown,
    }


@router.get("/class-wise")
def class_wise_report(academic_year: Optional[str] = Query(None), start_date: Optional[str] = Query(None), end_date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    ay = academic_year or db.query(models.SchoolSettings.current_academic_year).scalar() or "2024-2025"
    classes = db.query(models.Class).all()
    
    results = []
    for c in classes:
        student_count = db.query(func.count(models.Student.id)).filter(
            models.Student.class_id == c.id,
            models.Student.is_active == True
        ).scalar()
        
        class_fee_per_student = db.query(func.sum(models.FeeStructure.amount)).filter(
            models.FeeStructure.class_id == c.id,
            models.FeeStructure.academic_year == ay
        ).scalar() or Decimal("0")
        
        total_expected = class_fee_per_student * student_count
        
        collected_q = db.query(func.sum(models.FeePayment.amount_paid)).filter(
            models.FeePayment.class_id == c.id,
            models.FeePayment.is_cancelled == False
        )
        payments_q = db.query(func.count(models.FeePayment.id)).filter(
            models.FeePayment.class_id == c.id,
            models.FeePayment.is_cancelled == False
        )
        
        if start_date or end_date:
            if start_date:
                collected_q = collected_q.filter(models.FeePayment.payment_date >= start_date)
                payments_q = payments_q.filter(models.FeePayment.payment_date >= start_date)
            if end_date:
                collected_q = collected_q.filter(models.FeePayment.payment_date <= end_date)
                payments_q = payments_q.filter(models.FeePayment.payment_date <= end_date)
        else:
            # Only filter by academic year if no specific date range is requested
            collected_q = collected_q.filter(models.FeePayment.academic_year == ay)
            payments_q = payments_q.filter(models.FeePayment.academic_year == ay)
            
        collected = collected_q.scalar() or Decimal("0")
        payments_count = payments_q.scalar() or 0
        
        balance = max(Decimal("0"), total_expected - collected)
        
        results.append({
            "class": c.name,
            "collected": float(collected),
            "balance": float(balance),
            "payments": payments_count
        })
        
    return results

@router.get("/time-analytics")
def time_analytics(db: Session = Depends(get_db)):
    """ Returns payments grouped by hour of the day (e.g. 9-10 AM) """
    payments = db.query(models.FeePayment).filter(models.FeePayment.is_cancelled == False).all()
    # Group by hour
    hour_counts = {}
    for p in payments:
        if p.created_at:
            h = p.created_at.hour
            hour_counts[h] = hour_counts.get(h, 0) + 1
            
    # Format for Recharts
    chart_data = []
    for h in range(8, 18): # 8 AM to 5 PM
        am_pm = "AM" if h < 12 else "PM"
        display_h = h if h <= 12 else h - 12
        next_h = h + 1
        next_display = next_h if next_h <= 12 else next_h - 12
        next_am_pm = "AM" if next_h < 12 or next_h == 24 else "PM"
        
        label = f"{display_h} {am_pm} - {next_display} {next_am_pm}"
        if h == 12: label = "12 PM - 1 PM"
        
        chart_data.append({
            "time": label,
            "payments": hour_counts.get(h, 0)
        })
    return chart_data

@router.get("/yearly-analytics")
def yearly_analytics(db: Session = Depends(get_db)):
    """ Returns comparison of collections by year """
    payments = db.query(models.FeePayment).filter(models.FeePayment.is_cancelled == False).all()
    yearly_totals = {}
    
    for p in payments:
        if p.created_at:
            y = str(p.created_at.year)
            yearly_totals[y] = yearly_totals.get(y, Decimal("0")) + p.amount_paid
            
    chart_data = [{"year": y, "collection": float(amt)} for y, amt in yearly_totals.items()]
    return sorted(chart_data, key=lambda x: x["year"])

@router.get("/daybook")
def get_daybook(date: Optional[datetime.date] = Query(None), db: Session = Depends(get_db)):
    target_date = date or datetime.date.today()
    payments = db.query(models.FeePayment).options(
        joinedload(models.FeePayment.receipt),
        joinedload(models.FeePayment.student).joinedload(models.Student.class_)
    ).filter(
        models.FeePayment.payment_date == target_date,
        models.FeePayment.is_cancelled == False
    ).all()
    
    cash_total = sum(p.amount_paid for p in payments if p.payment_mode == models.PaymentMode.cash)
    online_total = sum(p.amount_paid for p in payments if p.payment_mode == models.PaymentMode.online)
    cheque_total = sum(p.amount_paid for p in payments if p.payment_mode == models.PaymentMode.cheque)
    dd_total = sum(p.amount_paid for p in payments if p.payment_mode == models.PaymentMode.dd)
    
    details = []
    for p in payments:
        details.append({
            "receipt_no": p.receipt.receipt_no if p.receipt else None,
            "student_name": p.student.name if p.student else None,
            "class_name": p.student.class_.name if p.student and p.student.class_ else None,
            "mode": p.payment_mode,
            "amount": float(p.amount_paid),
            "reference_no": p.reference_no,
            "time": p.created_at.strftime("%I:%M %p") if p.created_at else None
        })
        
    return {
        "date": target_date.isoformat(),
        "summary": {
            "cash": float(cash_total),
            "online": float(online_total),
            "cheque": float(cheque_total),
            "dd": float(dd_total),
            "total": float(cash_total + online_total + cheque_total + dd_total)
        },
        "transactions": details
    }


@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db)):
    """Returns pending fee alerts and recent payment notifications for the bell icon."""
    settings = db.query(models.SchoolSettings).first()
    ay = settings.current_academic_year if settings else "2024-2025"
    active_terms = terms_up_to(settings.current_term if settings else "Term 1")
    today = datetime.date.today()

    students = db.query(models.Student).filter(models.Student.is_active == True).all()
    pending_students = 0
    total_pending_amount = Decimal("0")

    for s in students:
        class_total = db.query(func.sum(models.FeeStructure.amount)).filter(
            models.FeeStructure.class_id == s.class_id,
            models.FeeStructure.term.in_(active_terms),
            models.FeeStructure.academic_year == ay
        ).scalar() or Decimal("0")
        if class_total == 0:
            continue
        total_paid = db.query(func.sum(models.FeePayment.amount_paid)).filter(
            models.FeePayment.student_id == s.id,
            models.FeePayment.term.in_(active_terms),
            models.FeePayment.academic_year == ay,
            models.FeePayment.is_cancelled == False
        ).scalar() or Decimal("0")
        balance = class_total - total_paid
        if balance > 0:
            pending_students += 1
            total_pending_amount += balance

    today_payments = db.query(models.FeePayment).filter(
        models.FeePayment.payment_date == today,
        models.FeePayment.is_cancelled == False
    ).order_by(models.FeePayment.id.desc()).limit(5).all()

    notifications = []
    if pending_students > 0:
        notifications.append({
            "id": "pending_fees",
            "type": "warning",
            "icon": "⚠️",
            "title": f"{pending_students} Students with Pending Fees",
            "message": f"Total outstanding: ₹{float(total_pending_amount):,.0f}",
            "time": "Now"
        })
    for p in today_payments:
        notifications.append({
            "id": f"payment_{p.id}",
            "type": "success",
            "icon": "✅",
            "title": f"Payment received — {p.student.name if p.student else 'Student'}",
            "message": f"₹{float(p.amount_paid):,.0f} · {p.payment_mode} · {p.term}",
            "time": p.created_at.strftime("%I:%M %p") if p.created_at else "Today"
        })

    return {
        "count": len(notifications),
        "unread": len(notifications),
        "items": notifications
    }


@router.get("/collection-trend")
def collection_trend(period: str = Query("month"), db: Session = Depends(get_db)):
    """Returns payment collection trend filtered by period: today | week | month | year"""
    today = datetime.date.today()

    if period == "today":
        payments = db.query(models.FeePayment).filter(
            models.FeePayment.payment_date == today,
            models.FeePayment.is_cancelled == False
        ).all()
        hourly = {}
        for p in payments:
            h = p.created_at.hour if p.created_at else 9
            hourly[h] = hourly.get(h, 0) + float(p.amount_paid)
        data = []
        for h in range(8, 18):
            label = f"{h if h <= 12 else h - 12} {'AM' if h < 12 else 'PM'}"
            data.append({"label": label, "amount": hourly.get(h, 0)})
        return data

    elif period == "week":
        start = today - datetime.timedelta(days=6)
        payments = db.query(models.FeePayment).filter(
            models.FeePayment.payment_date >= start,
            models.FeePayment.payment_date <= today,
            models.FeePayment.is_cancelled == False
        ).all()
        daily = {}
        for p in payments:
            daily[p.payment_date] = daily.get(p.payment_date, 0) + float(p.amount_paid)
        data = []
        for i in range(7):
            d = start + datetime.timedelta(days=i)
            data.append({"label": d.strftime("%a %d"), "amount": daily.get(d, 0)})
        return data

    elif period == "month":
        first = today.replace(day=1)
        payments = db.query(models.FeePayment).filter(
            models.FeePayment.payment_date >= first,
            models.FeePayment.payment_date <= today,
            models.FeePayment.is_cancelled == False
        ).all()
        weekly = {}
        for p in payments:
            week_num = (p.payment_date.day - 1) // 7 + 1
            key = f"Week {week_num}"
            weekly[key] = weekly.get(key, 0) + float(p.amount_paid)
        data = [{"label": k, "amount": v} for k, v in sorted(weekly.items())]
        return data if data else [{"label": "Week 1", "amount": 0}]

    else:  # year
        import calendar
        year_start = today.replace(month=1, day=1)
        payments = db.query(models.FeePayment).filter(
            models.FeePayment.payment_date >= year_start,
            models.FeePayment.payment_date <= today,
            models.FeePayment.is_cancelled == False
        ).all()
        monthly = {}
        for p in payments:
            m = p.payment_date.month
            monthly[m] = monthly.get(m, 0) + float(p.amount_paid)
        data = []
        for m in range(1, today.month + 1):
            data.append({"label": calendar.month_abbr[m], "amount": monthly.get(m, 0)})
        return data


@router.get("/recent-payments")
def recent_payments_list(limit: int = Query(5), db: Session = Depends(get_db)):
    """Returns last N payments for the Recent Payments widget."""
    payments = db.query(models.FeePayment).filter(
        models.FeePayment.is_cancelled == False
    ).order_by(models.FeePayment.id.desc()).limit(limit).all()

    result = []
    for p in payments:
        result.append({
            "id": p.id,
            "student_name": p.student.name if p.student else "Unknown",
            "class_name": p.student.class_.name if p.student and p.student.class_ else "",
            "amount": float(p.amount_paid),
            "term": p.term,
            "payment_mode": str(p.payment_mode),
            "payment_date": p.payment_date.isoformat() if p.payment_date else None,
            "receipt_no": p.receipt.receipt_no if p.receipt else None,
            "time": p.created_at.strftime("%I:%M %p") if p.created_at else None
        })
    return result
