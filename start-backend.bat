@echo off
title PC Club Backend API (LAN Mode)
cd /d "%~dp0"
set PYTHONPATH=backend
echo ========================================================
echo Starting PC Club Server on 0.0.0.0:8000 (LAN Accessible)...
echo Other PCs on your local network can connect via your LAN IP.
echo Run 'ipconfig' to check your IPv4 address (e.g. 192.168.1.50).
echo ========================================================
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend --reload
pause
