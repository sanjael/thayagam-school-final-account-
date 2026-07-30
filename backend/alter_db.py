from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
import os
from dotenv import load_dotenv

load_dotenv()
DB_PASSWORD = quote_plus(os.getenv('DB_PASSWORD', 'San@2005'))
DATABASE_URL = f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:{DB_PASSWORD}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'school_fee_system')}?charset=utf8mb4"

engine = create_engine(DATABASE_URL)
with engine.connect() as con:
    statements = [
        "ALTER TABLE fee_payments ADD COLUMN fine DECIMAL(10, 2) DEFAULT 0",
        "ALTER TABLE fee_payments ADD COLUMN discount DECIMAL(10, 2) DEFAULT 0",
        "ALTER TABLE fee_payments ADD COLUMN reference_no VARCHAR(100) NULL",
        "ALTER TABLE fee_payments ADD COLUMN is_cancelled BOOLEAN DEFAULT FALSE",
        "ALTER TABLE fee_payments ADD COLUMN cancellation_reason TEXT NULL"
    ]
    for s in statements:
        try:
            con.execute(text(s))
            con.commit()
            print("Executed:", s)
        except Exception as e:
            print(f"Error on {s}: {e}")
print("Done modifying table.")
