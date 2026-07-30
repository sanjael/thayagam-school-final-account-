import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    res = conn.execute(text("SELECT current_academic_year FROM school_settings")).fetchall()
    print("current_academic_year:", res)
