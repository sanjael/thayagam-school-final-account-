from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base, SessionLocal
from app.models import User, SchoolSettings, Class
from app.auth import hash_password
from app.routers import auth, classes, students, fee_structure, payments, reports, settings, receipts, audit, users
from app.scheduler import start_scheduler
import os

# Create all tables on startup
Base.metadata.create_all(bind=engine)

def auto_seed():
    db = SessionLocal()
    try:
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
            else:
                u.hashed_password = hash_password('Admin@123')
                u.role = role

        s = db.query(SchoolSettings).first()
        if not s:
            db.add(SchoolSettings(
                school_name='Sri Thayagam Matriculation School',
                address='Tamil Nadu', phone='9876543210',
                correspondent_name='Correspondent Name',
                principal_name='Principal Name',
                current_academic_year='2024-2025'
            ))

        default_classes = ["LKG", "UKG"] + [f"Class {i}" for i in range(1, 13)]
        for c_name in default_classes:
            exists = db.query(Class).filter(Class.name == c_name).first()
            if not exists:
                db.add(Class(name=c_name, section=None))

        db.commit()
        print("AUTO SEED COMPLETED SUCCESSFULLY!")
    except Exception as e:
        print("AUTO SEED ERROR:", e)
    finally:
        db.close()

app = FastAPI(
    title="School Fee System API",
    description="School fee management — students, fees, receipts, reports.",
    version="1.0.0"
)

# Start background jobs & seed database
@app.on_event("startup")
def on_startup():
    try:
        auto_seed()
    except Exception as e:
        print("AUTO SEED AT STARTUP FAILED:", e)
    start_scheduler()

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import json

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    err = exc.errors()
    body = b""
    try:
        body = await request.body()
    except Exception:
        pass
    print("VALIDATION ERROR:", err, "BODY:", body)
    with open("validation_errors.log", "a") as f:
        f.write(json.dumps(err) + "\n")
        f.write("BODY: " + body.decode('utf-8', 'ignore') + "\n")
    return JSONResponse(status_code=422, content={"detail": err})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "https://thayagam-school-frontend.vercel.app"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded logos
os.makedirs("static/logos", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Routers
app.include_router(auth.router)
app.include_router(classes.router)
app.include_router(students.router)
app.include_router(fee_structure.router)
app.include_router(payments.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(receipts.router)
app.include_router(audit.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {"message": "School Fee System backend is running.", "version": "1.0.0"}
