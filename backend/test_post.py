import urllib.request
import urllib.error
import json

payload = {
    "student_id": 1,
    "term": "Term 1",
    "academic_year": "2024-2025",
    "amount_paid": 5000,
    "payment_date": "2026-07-23",
    "payment_mode": "upi",
    "fine": 0,
    "discount": 0,
    "reference_no": "",
    "notes": ""
}
req = urllib.request.Request("http://localhost:8000/payments/", data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))
