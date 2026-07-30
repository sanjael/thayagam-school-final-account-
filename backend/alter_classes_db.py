import os
import sys

# Add the backend directory to sys.path so we can import app module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    # Drop unique constraint on `name`
    try:
        conn.execute(text("ALTER TABLE classes DROP INDEX name;"))
        print("Dropped unique index on name.")
    except Exception as e:
        print("Could not drop index (might not exist):", e)
    
    # Add unique constraint on name + section
    try:
        conn.execute(text("ALTER TABLE classes ADD UNIQUE INDEX uq_class_name_section (name, section);"))
        print("Added composite unique index.")
    except Exception as e:
        print("Could not add composite index:", e)

print("Done.")
