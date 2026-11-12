@echo off
title PC Club - Local Multi-Station Simulator (Admin + PC 1 + PC 2)
color 0b

echo ============================================================
echo   PC CLUB ECOSYSTEM - MULTI-STATION LOCAL SIMULATOR
echo ============================================================
echo  1. Backend Server:  http://127.0.0.1:8000
echo  2. Admin Console:   http://localhost:5174
echo  3. Gaming Station 1: http://localhost:5173 (PC #1)
echo  4. Gaming Station 2: http://localhost:5173 (PC #2)
echo ============================================================

:: 1. Ensure backend is running
netstat -ano | findstr :8000 >nul
if %errorlevel% neq 0 (
    echo [*] Starting Backend Server...
    start "PC Club Server" cmd /k "cd /d "%~dp0backend" && .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    timeout /t 3 /nobreak >nul
) else (
    echo [✓] Backend Server already running on port 8000.
)

:: 2. Ensure Admin Vite is running
netstat -ano | findstr :5174 >nul
if %errorlevel% neq 0 (
    echo [*] Starting Admin Web Console...
    start "PC Club Admin" cmd /k "cd /d "%~dp0admin-desktop" && npx vite --host 0.0.0.0 --port 5174"
    timeout /t 2 /nobreak >nul
) else (
    echo [✓] Admin Web Console already running on port 5174.
)

:: 3. Ensure Client Vite is running
netstat -ano | findstr :5173 >nul
if %errorlevel% neq 0 (
    echo [*] Starting Client Kiosk Service...
    start "PC Club Kiosk" cmd /k "cd /d "%~dp0desktop" && npx vite --host 0.0.0.0 --port 5173"
    timeout /t 2 /nobreak >nul
) else (
    echo [✓] Client Kiosk Service already running on port 5173.
)

echo.
echo [*] Opening Admin Console in Chrome / Browser...
start "" "http://localhost:5174"

timeout /t 1 /nobreak >nul
echo [*] Opening Station 1 (PC #1)...
start "" "http://localhost:5173/?pc_id=pc-001&pc_label=PC%%20%%231&server_ip=127.0.0.1"

timeout /t 1 /nobreak >nul
echo [*] Opening Station 2 (PC #2)...
start "" "http://localhost:5173/?pc_id=pc-002&pc_label=PC%%20%%232&server_ip=127.0.0.1"

echo.
echo ============================================================
echo [SUCCESS] Admin Console, PC #1, and PC #2 are all active!
echo Check your browser windows:
echo   - Window 1: Admin Console (shows PC #1 and PC #2 Green/Online)
echo   - Window 2: Station 1 (Locked as PC #1)
echo   - Window 3: Station 2 (Locked as PC #2)
echo ============================================================
pause
