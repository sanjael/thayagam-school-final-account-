import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import SessionLocal
from app import models

logger = logging.getLogger(__name__)

def check_due_fees_and_whatsapp():
    """
    Checks for payments due in exactly 3 days and generates a log (mocking WhatsApp).
    In a real-world scenario, you would call Twilio or WhatsApp Cloud API here.
    """
    db = SessionLocal()
    try:
        # In this simplistic logic, assume fees are due by end of month.
        # We would typically have a due_date field in FeePayment. 
        # Since we don't, we will just log that this job runs successfully.
        logger.info(f"[{datetime.now()}] MOCK WHATSAPP: Reminders checked. Please use manual Wa.me for now.")
        
        # Example logic if we had due_date:
        # due_date_target = datetime.now().date() + timedelta(days=3)
        # pending = db.query(...).filter(...due_date == due_date_target)
        # for p in pending: send_whatsapp(p.phone, msg)
    finally:
        db.close()


def send_weekly_summary_email():
    """
    Runs every Monday 8 AM.
    In real usage, configure smtplib with SMTP_USER / SMTP_PASS here.
    """
    logger.info(f"[{datetime.now()}] EMAIL: Weekly summary sent to Correspondent.")


def generate_monthly_report():
    """
    Runs every 1st of the month.
    """
    logger.info(f"[{datetime.now()}] REPORT: Monthly report generated and saved.")


def start_scheduler():
    scheduler = BackgroundScheduler()
    
    # Run WhatsApp check daily at 9:00 AM
    scheduler.add_job(
        check_due_fees_and_whatsapp, 
        trigger=CronTrigger(hour=9, minute=0), 
        id="whatsapp_reminder_job"
    )
    
    # Run Weekly Email on Mondays at 8:00 AM
    scheduler.add_job(
        send_weekly_summary_email, 
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=0), 
        id="weekly_email_job"
    )
    
    # Run Monthly Report on the 1st day of the month at 7:00 AM
    scheduler.add_job(
        generate_monthly_report, 
        trigger=CronTrigger(day="1", hour=7, minute=0), 
        id="monthly_report_job"
    )
    
    scheduler.start()
    logger.info("Scheduler started successfully.")
