@echo off
:: PC Club Windows Firewall LAN Unblocker
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator permissions to open Firewall ports...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

title PC Club LAN Firewall Unblocker
color 0a
echo ============================================================
echo   CONFIGURING WINDOWS FIREWALL FOR PC CLUB ECOSYSTEM
echo ============================================================
echo [1/3] Adding rule for Backend API Server (TCP 8000)...
netsh advfirewall firewall delete rule name="PCClub Server Port 8000" >nul 2>&1
netsh advfirewall firewall add rule name="PCClub Server Port 8000" dir=in action=allow protocol=TCP localport=8000 profile=any

echo [2/3] Adding rule for Admin Control Console (TCP 5174)...
netsh advfirewall firewall delete rule name="PCClub Admin Port 5174" >nul 2>&1
netsh advfirewall firewall add rule name="PCClub Admin Port 5174" dir=in action=allow protocol=TCP localport=5174 profile=any

echo [3/3] Adding rule for Gaming Kiosk Client (TCP 5173)...
netsh advfirewall firewall delete rule name="PCClub Kiosk Port 5173" >nul 2>&1
netsh advfirewall firewall add rule name="PCClub Kiosk Port 5173" dir=in action=allow protocol=TCP localport=5173 profile=any

echo ============================================================
echo  [SUCCESS] All LAN ports (8000, 5174, 5173) are now OPEN!
echo  Other computers on your Wi-Fi/LAN can now connect seamlessly.
echo ============================================================
timeout /t 3
exit /b 0
