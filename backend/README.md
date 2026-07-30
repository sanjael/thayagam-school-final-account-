# School Fee System Backend

This backend uses Python and FastAPI with MySQL for the school fee management system.

## Setup

1. Create a virtual environment (Windows):
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy pymysql python-jose passlib[bcrypt] pydantic
   ```
3. Run the app:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Notes
- Database connection should use MySQL with the configured password `San@2005`.
- JWT authentication will be added in subsequent phases.
