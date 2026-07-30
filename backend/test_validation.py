import requests
from datetime import date

payload = {
    "student_id": 1,
    "term": "Term 1",
    "academic_year": "2024-2025",
    "amount_paid": 5000,
    "payment_date": date.today().isoformat(),
    "payment_mode": "online",
    "fine": 0,
    "discount": 0,
    "reference_no": "",
    "notes": ""
}

# we need an admin token
# Let's bypass token by just sending to a test endpoint, or let's see if we can get a token
# Actually, wait, let's just create a dummy admin token if we have a secret key.
# Or better, just print out the validation error by calling the schema directly!
from app.schemas import FeePaymentCreate
from pydantic import ValidationError

try:
    FeePaymentCreate(**payload)
    print("Payload is VALID for Pydantic.")
except ValidationError as e:
    print("Pydantic Validation Error:")
    print(e.json())

# Let's also check with 'upi' payment mode
payload['payment_mode'] = 'upi'
try:
    FeePaymentCreate(**payload)
    print("Payload with UPI is VALID for Pydantic.")
except ValidationError as e:
    print("Pydantic Validation Error with UPI:")
    print(e.json())
