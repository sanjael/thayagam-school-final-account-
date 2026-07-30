from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import auth, classes, students, fee_structure, payments, reports, settings, receipts, audit, users
from app.scheduler import start_scheduler
import os

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="School Fee System API",
    description="School fee management — students, fees, receipts, reports.",
    version="1.0.0"
)

# Start background jobs
@app.on_event("startup")
def on_startup():
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
