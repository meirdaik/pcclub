@echo off
title PC Club Kiosk Desktop Client
cd /d "%~dp0\desktop"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ========================================================
echo Starting PC Club Kiosk Desktop App (Electron + React)...
echo Tip: Press Ctrl + Shift + Q to exit kiosk mode.
echo ========================================================
npm run electron:dev
pause
