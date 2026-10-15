@echo off
echo ============================================================
echo Starting Sri Thayagam School Fee Management System Stack...
echo ============================================================
echo.

REM 1. Start FastAPI Backend Server
echo Starting FastAPI Backend Server on port 8000...
start "Thayagam School Backend" cmd /c "cd /d "%~dp0backend" && call .venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM 2. Start Vite Frontend Server
echo Starting Frontend on port 3000...
start "Thayagam School Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ============================================================
echo Stack launched!
echo - Frontend: http://localhost:3000
echo - Backend:  http://localhost:8000
echo - API Docs: http://localhost:8000/docs
echo - Login:    admin / Admin@123
echo ============================================================
pause
