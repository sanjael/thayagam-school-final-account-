from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from urllib.parse import quote_plus
import os

load_dotenv()

raw_url = os.getenv("DATABASE_URL", "")

if raw_url and not raw_url.startswith("sqlite"):
    DATABASE_URL = raw_url
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    # Always force Supabase PostgreSQL connection
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
