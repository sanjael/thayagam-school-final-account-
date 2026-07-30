@echo off
echo Starting Sri Thayagam School - Backend Server...
echo.
call .venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
