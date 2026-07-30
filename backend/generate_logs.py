import sys, os
from app.database import SessionLocal
from app.models import AuditLog, User
from datetime import datetime, timedelta
import random

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()
acc = db.query(User).filter(User.username == 'accountant').first()

# clear existing
db.query(AuditLog).delete()
db.commit()

logs = [
    (admin.id, 'School Settings Updated', 'Updated academic year to 2024-2025.'),
    (admin.id, 'Class Added', 'Created new class: Grade 10 - Section A.'),
    (acc.id, 'Payment Recorded', 'Recorded ₹10,000 for Student RCP-2026-0001 (Term 1).'),
    (acc.id, 'Payment Recorded', 'Recorded ₹5,000 for Student RCP-2026-0002 (Term 1).'),
    (admin.id, 'Fee Structure Modified', 'Updated Term 1 fee for Class 6 to ₹10,000.'),
    (admin.id, 'Student Registered', 'Registered new student: John Doe (Grade 10).'),
    (admin.id, 'System Login', 'Admin logged into the portal.'),
    (acc.id, 'System Login', 'Accountant logged into the portal.')
]

# Insert dummy logs with recent dates
for i, (uid, action, details) in enumerate(logs):
    db.add(AuditLog(
        user_id=uid,
        action=action,
        details=details,
        created_at=datetime.utcnow() - timedelta(hours=i*2 + random.randint(1, 5))
    ))

db.commit()
print('Dummy audit logs inserted!')
