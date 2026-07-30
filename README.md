# School Fee Management System

## Quick Start

### 1. Database Setup
Open MySQL and run:
```sql
source database/schema.sql
```

### 2. Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs at: http://localhost:3000

---

## Default Login
- Username: `admin`
- Password: `Admin@123`

---

## Modules
| Module | Route |
|---|---|
| Login | /login |
| Dashboard | /dashboard |
| Students | /students |
| Classes | /classes |
| Fee Structure | /fees |
| Payments | /payments |
| Reports | /reports |
| Settings | /settings |

---

## Receipt PDF
After recording a payment, click the **Print** button on the Payments page.
PDF includes school logo, student details, fee breakdown, and 3 signatures
(Correspondent, Cashier, Principal).

## Notes
- Set school name, logo, and signature names in **Settings** before printing receipts.
- Fee structure must be defined in **Fee Structure** before recording payments.
- Soft-delete used for students (deactivated, not permanently deleted).
