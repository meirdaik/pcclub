@echo off
title PC Club Unified Ecosystem Launcher
color 0b
echo ============================================================
echo       PC CLUB ECOSYSTEM - UNIFIED ONE-CLICK LAUNCH
echo ============================================================
echo  [1/3] Launching FastAPI Backend Server on 0.0.0.0:8000...
echo  [2/3] Launching Cashier Admin Console on port 5174...
echo  [3/3] Launching Player Gaming Client Kiosk on port 5173...
echo ============================================================

:: 1. Start Backend in a dedicated window
start "PC Club [Backend API Server]" cmd /k "cd /d "%~dp0backend" && .\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Give backend 3 seconds to spin up and auto-seed database
timeout /t 3 /nobreak >nul

:: 2. Start Admin Control Center
start "PC Club [Admin Console]" cmd /k "cd /d "%~dp0admin-desktop" && npm run dev"

:: Give admin panel a moment
timeout /t 2 /nobreak >nul

:: 3. Start Player Gaming Client
start "PC Club [Gaming Client]" cmd /k "cd /d "%~dp0desktop" && npm run dev"

echo.
echo [SUCCESS] All 3 ecosystem modules launched successfully!
echo.
echo - Backend API:        http://127.0.0.1:8000/docs
echo - Admin Control Map:  http://localhost:5174
echo - Player Lock Screen: http://localhost:5173
echo.
echo Keep this window open or press any key to close launcher.
pause >nul
