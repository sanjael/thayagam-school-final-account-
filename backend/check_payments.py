import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    res = conn.execute(text("SELECT academic_year, COUNT(*) FROM fee_payments GROUP BY academic_year")).fetchall()
    print("Fee payments academic_year:", res)
