@echo off
setlocal enabledelayedexpansion
title PC Club Unified Product Packager
color 0a

echo ============================================================
echo       PC CLUB ECOSYSTEM - UNIFIED PRODUCT BUILDER
echo ============================================================
echo Target Executables:
echo   1. release\PCClub-Admin-Control.exe (Cashier / Owner Desk)
echo   2. release\PCClub-Gaming-Client.exe (Player Gaming Station)
echo ============================================================

set ROOT_DIR=%~dp0
set RELEASE_DIR=%ROOT_DIR%release

if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

echo.
echo [1/2] Building Admin Control Center Standalone Executable...
cd /d "%ROOT_DIR%admin-desktop"
call npm run dist:portable
if %errorlevel% neq 0 (
    echo [ERROR] Admin desktop build failed!
    pause
    exit /b %errorlevel%
)

if exist "%ROOT_DIR%admin-desktop\release\PCClub-Admin-Control.exe" (
    copy /Y "%ROOT_DIR%admin-desktop\release\PCClub-Admin-Control.exe" "%RELEASE_DIR%\PCClub-Admin-Control.exe"
    echo [✓] Generated release\PCClub-Admin-Control.exe
)

echo.
echo [2/2] Building Gaming Client Kiosk Standalone Executable...
cd /d "%ROOT_DIR%desktop"
call npm run dist:portable
if %errorlevel% neq 0 (
    echo [ERROR] Gaming client build failed!
    pause
    exit /b %errorlevel%
)

if exist "%ROOT_DIR%desktop\release\PCClub-Gaming-Client.exe" (
    copy /Y "%ROOT_DIR%desktop\release\PCClub-Gaming-Client.exe" "%RELEASE_DIR%\PCClub-Gaming-Client.exe"
    echo [✓] Generated release\PCClub-Gaming-Client.exe
)

:: Create sample config.json in release directory
echo {> "%RELEASE_DIR%\config.json"
echo   "serverIp": "127.0.0.1",>> "%RELEASE_DIR%\config.json"
echo   "serverPort": 8000,>> "%RELEASE_DIR%\config.json"
echo   "pcNumber": 1,>> "%RELEASE_DIR%\config.json"
echo   "pcId": "pc-001",>> "%RELEASE_DIR%\config.json"
echo   "pcLabel": "PC #1",>> "%RELEASE_DIR%\config.json"
echo   "clubName": "CYBER ARENA CLUB">> "%RELEASE_DIR%\config.json"
echo }>> "%RELEASE_DIR%\config.json"

echo.
echo ============================================================
echo  [SUCCESS] All Production Executables Packaged Successfully!
echo ============================================================
echo Output Folder: %RELEASE_DIR%
dir "%RELEASE_DIR%"
echo ============================================================
pause
