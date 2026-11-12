@echo off
title Launch Electron Stations (PC 1 + PC 2)
color 0a

echo ============================================================
echo   LAUNCHING DUAL ELECTRON KIOSK WINDOWS (PC #1 + PC #2)
echo ============================================================

start "PC Club Station 1" cmd /c "cd /d "%~dp0desktop" && npx electron . --windowed --pc=1"
timeout /t 2 /nobreak >nul
start "PC Club Station 2" cmd /c "cd /d "%~dp0desktop" && npx electron . --windowed --pc=2"

echo [✓] Launched Station 1 (PC #1) and Station 2 (PC #2) side-by-side!
