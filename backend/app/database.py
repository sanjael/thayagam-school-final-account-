from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from urllib.parse import quote_plus
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DB_HOST     = os.getenv("DB_HOST", "")
    DB_PORT     = os.getenv("DB_PORT", "")
    DB_NAME     = os.getenv("DB_NAME", "")
    DB_USER     = os.getenv("DB_USER", "")
    DB_PASSWORD = quote_plus(os.getenv("DB_PASSWORD", ""))
    
    if DB_HOST and DB_PORT and DB_USER:
        DB_DIALECT = "postgresql" if DB_PORT == "5432" else "mysql+pymysql"
        DATABASE_URL = f"{DB_DIALECT}://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        DATABASE_URL = "sqlite:///./school.db"

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
