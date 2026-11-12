@echo off
title PC Club Backend API
cd /d "%~dp0"
set PYTHONPATH=backend
echo ========================================================
echo Starting PC Club Backend on http://127.0.0.1:8000 ...
echo ========================================================
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload
pause
