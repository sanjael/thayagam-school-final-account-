from sqlalchemy import text
import sys
import os

# Add parent directory to sys.path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine

def main():
    print("Connecting to database to alter students table...")
    with engine.connect() as con:
        statements = [
            "ALTER TABLE students ADD COLUMN discount DECIMAL(10, 2) DEFAULT 0.0",
            "ALTER TABLE students ADD COLUMN discount_reason VARCHAR(255) NULL"
        ]
        for s in statements:
            try:
                con.execute(text(s))
                con.commit()
                print("Successfully executed:", s)
            except Exception as e:
                # If column already exists or other error, print it
                print(f"Skipping/Error on '{s}': {e}")
    print("Migration finished.")

if __name__ == "__main__":
    main()
