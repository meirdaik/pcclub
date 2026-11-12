@echo off
title PC Club Kiosk Client
cd /d "%~dp0\desktop"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ========================================================
echo Starting PC Club Kiosk Shell (Explorer Takeover + Win Block)...
echo Tips:
echo   - To access Admin Maintenance: Ctrl + Shift + A (PIN: admin123)
echo   - To Emergency Unlock:         Ctrl + Shift + Q
echo   - To Open LAN Setup:           Ctrl + Shift + S
echo ========================================================

:: Clean any stale maintenance flag so kiosk mode takes effect
if exist "C:\ProgramData\PCClub\maintenance.flag" del /f /q "C:\ProgramData\PCClub\maintenance.flag"

npx electron .
pause
