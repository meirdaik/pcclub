@echo off
title PC Club Unified Ecosystem (LAN and Dev Launcher)
color 0b

echo ============================================================
echo       PC CLUB ECOSYSTEM - UNIFIED LAN AND DEV LAUNCHER
echo ============================================================

:: 1. Detect Real LAN IPv4 Address
set LAN_IP=127.0.0.1
for /f "tokens=*" %%a in ('backend\.venv\Scripts\python.exe -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()"') do set LAN_IP=%%a

echo [OK] Detected Host LAN IPv4: %LAN_IP%

:: 2. Auto-sync LAN IP to desktop/config.json and AppData
echo [*] Syncing LAN IP to desktop/config.json and AppData...
backend\.venv\Scripts\python.exe -c "import json, os, sys; ip = sys.argv[1]; paths = ['desktop/config.json', 'desktop/release/config.json', os.path.expandvars(r'%%APPDATA%%\pcclub-desktop\config.json')]; [open(p, 'w').write(json.dumps({**json.load(open(p)), 'serverIp': ip} if os.path.exists(p) else {'serverIp': ip, 'serverPort': 8000, 'pcId': 'pc-002', 'pcNumber': 2, 'pcLabel': 'PC #2', 'authToken': 'dev-pc-token'}, indent=2)) for p in paths if os.path.exists(os.path.dirname(p))]" %LAN_IP%

:: 3. Launch Backend if not already listening
netstat -ano | findstr :8000 | findstr LISTEN >nul
if errorlevel 1 (
    echo [*] Starting FastAPI Backend on 0.0.0.0:8000
    start "PC Club [Backend API Server]" cmd /k "cd /d "%~dp0backend" && .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Backend Server is already listening on port 8000
)

:: 4. Launch Cashier Admin Console if not already listening
netstat -ano | findstr :5174 | findstr LISTEN >nul
if errorlevel 1 (
    echo [*] Starting Cashier Admin Console on port 5174
    start "PC Club [Admin Console]" cmd /k "cd /d "%~dp0admin-desktop" && npx vite --host 0.0.0.0 --port 5174"
    timeout /t 2 /nobreak >nul
) else (
    echo [OK] Cashier Admin Console is already listening on port 5174
)

:: 5. Launch Player Gaming Kiosk if not already listening
netstat -ano | findstr :5173 | findstr LISTEN >nul
if errorlevel 1 (
    echo [*] Starting Player Gaming Kiosk on port 5173
    start "PC Club [Gaming Client]" cmd /k "cd /d "%~dp0desktop" && npx vite --host 0.0.0.0 --port 5173"
    timeout /t 2 /nobreak >nul
) else (
    echo [OK] Player Gaming Kiosk is already listening on port 5173
)

echo.
echo ============================================================
echo   [SUCCESS] PC CLUB ECOSYSTEM READY FOR LOCAL AND LAN PLAY!
echo ============================================================
echo.
echo   LOCAL ACCESS (On This Main PC):
echo   ------------------------------------------------------------
echo   * Cashier Admin Map:       http://localhost:5174
echo   * Station #1 Web Kiosk:    http://localhost:5173
echo   * Backend Swagger API:     http://127.0.0.1:8000/docs
echo.
echo   LAN ACCESS (For PC #2 or Other Devices on Wi-Fi):
echo   ------------------------------------------------------------
echo   * Download Kiosk .EXE:     http://%LAN_IP%:8000/download/kiosk
echo   * Web Download Portal:     http://%LAN_IP%:8000/download
echo   * Station #2 Web Kiosk:    http://%LAN_IP%:5173/?pc_id=pc-002^&server_ip=%LAN_IP%
echo   * Cashier Admin on LAN:    http://%LAN_IP%:5174
echo.
echo   LAN TROUBLESHOOTING:
echo   1. Windows Firewall: If PC #2 cannot connect, run open-lan-firewall.bat
echo      as Administrator.
echo   2. University / Public Wi-Fi: If university Wi-Fi blocks LAN
echo      communication (AP Isolation), turn on "Mobile Hotspot" in
echo      Windows Settings and connect PC #2 to this PC's hotspot!
echo ============================================================
echo.
pause
