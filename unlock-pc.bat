@echo off
title PC Club Emergency PC Unlocker & Shell Restorer
color 0a

echo ========================================================
echo   PC CLUB - EMERGENCY PC UNLOCKER & KEYBOARD RESTORER
echo ========================================================
echo [*] Terminating Key Blocker and Kiosk processes...
taskkill /F /IM keyBlocker.exe >nul 2>&1
taskkill /F /IM "PC Club Kiosk.exe" >nul 2>&1
taskkill /F /IM "PCClub-Gaming-Client.exe" >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1

echo [*] Restoring Windows Registry policies...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableRegistryTools /f >nul 2>&1
reg delete "HKCU\Software\Policies\Microsoft\Windows\System" /v DisableCMD /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v NoWinKeys /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v NoRun /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoRestartShell /t REG_DWORD /d 1 /f >nul 2>&1

if exist "C:\ProgramData\PCClub\maintenance.flag" del /f /q "C:\ProgramData\PCClub\maintenance.flag" >nul 2>&1

echo [*] Ensuring Windows Explorer (Taskbar & Start Menu) is running...
tasklist /FI "IMAGENAME eq explorer.exe" 2>nul | find /I /N "explorer.exe" >nul
if errorlevel 1 (
    start explorer.exe
)

echo.
echo ========================================================
echo  [SUCCESS] PC UNLOCKED!
echo  All Windows keys (Win, Alt+Tab) & Explorer are RESTORED.
echo ========================================================
timeout /t 3
exit /b 0
