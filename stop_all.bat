@echo off
echo Stopping Sri Thayagam School servers...
taskkill /F /FI "WINDOWTITLE eq Thayagam School*" 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a 2>nul
echo All Sri Thayagam School processes stopped.
pause
