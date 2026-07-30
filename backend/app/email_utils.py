import smtplib
import os
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

def send_otp_email(to_email: str, otp: str):
    subject = "Your OTP for Thayagam Registration"
    body = f"Hello,\n\nYour OTP for registration is: {otp}\n\nThis OTP is valid for 5 minutes.\n\nThank you."
    
    if SMTP_SERVER and SMTP_USER and SMTP_PASSWORD:
        msg = EmailMessage()
        msg.set_content(body)
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = to_email
        
        try:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
            print(f"OTP sent to {to_email}")
        except Exception as e:
            print(f"Failed to send email to {to_email}: {e}")
            # Raise the error so it bubbles up to the API response
            raise e
    else:
        # Fallback for development if no SMTP configured
        print(f"--- MOCK EMAIL (No SMTP config) --- \nTo: {to_email}\nSubject: {subject}\nBody: {body}\n------------------")
