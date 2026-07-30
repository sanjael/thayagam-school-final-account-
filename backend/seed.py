import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models import User, SchoolSettings, Class
from app.auth import hash_password

db = SessionLocal()

# Seed Users
for username, role, email in [
    ('admin', 'admin', 'admin@school.com'),
    ('accountant', 'accountant', 'accountant@school.com'),
    ('principal', 'principal', 'principal@school.com')
]:
    u = db.query(User).filter(User.username == username).first()
    if not u:
        db.add(User(
            username=username, email=email,
            hashed_password=hash_password('Admin@123'),
            role=role, is_active=True
        ))
        print(f'{username} created')
    else:
        u.hashed_password = hash_password('Admin@123')
        u.role = role
        print(f'{username} password reset')

s = db.query(SchoolSettings).first()
if not s:
    db.add(SchoolSettings(
        school_name='Sri Thayagam Matriculation School',
        address='Tamil Nadu', phone='9876543210',
        correspondent_name='Correspondent Name',
        principal_name='Principal Name',
        current_academic_year='2024-2025'
    ))
    print('Settings created')
else:
    print('Settings already exist')

db.commit()

# Seed Classes
default_classes = ["LKG", "UKG"] + [f"Class {i}" for i in range(1, 13)]
for c_name in default_classes:
    exists = db.query(Class).filter(Class.name == c_name).first()
    if not exists:
        db.add(Class(name=c_name, section=None))
        print(f"Class {c_name} created")
    else:
        print(f"Class {c_name} already exists")

db.commit()
db.close()
print('Seed complete')
