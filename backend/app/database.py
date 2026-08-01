from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from urllib.parse import quote_plus
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    DB_HOST     = os.getenv("DB_HOST", "")
    DB_PORT     = os.getenv("DB_PORT", "")
    DB_NAME     = os.getenv("DB_NAME", "")
    DB_USER     = os.getenv("DB_USER", "")
    DB_PASSWORD = quote_plus(os.getenv("DB_PASSWORD", ""))
    
    if DB_HOST and DB_USER:
        DB_PORT = DB_PORT or "6543"
        DB_DIALECT = "postgresql+psycopg2" if DB_PORT in ("5432", "6543") else "mysql+pymysql"
        DATABASE_URL = f"{DB_DIALECT}://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        # Default Supabase PostgreSQL connection
        DATABASE_URL = "postgresql+psycopg2://postgres.xzcwabwrtodcfxcvuevh:thaayagam001@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"

is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine_kwargs = {
    "echo": False,
    "connect_args": connect_args
}
if not is_sqlite:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 3,
        "max_overflow": 2
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
