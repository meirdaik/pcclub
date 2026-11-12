@echo off
title Unlock PC Terminal
echo ========================================================
echo Sending UNLOCK command to PC #1 (station pc-001)...
echo ========================================================
powershell -Command "Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/pc/pc-001/unlock' -Method POST -ContentType 'application/json' -Body '{\"username\": \"Vaqlur\", \"remaining_seconds\": 3600}' | Format-List"
pause
