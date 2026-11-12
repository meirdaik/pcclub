# 🚀 PC Club (SENET-Style) LAN Deployment & Operator Guide

This guide walks you through deploying and operating the **PC Club Management System** across multiple computers in your club's Local Area Network (LAN).

---

## 🏛️ Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │            CLUB SERVER / CASHIER PC          │
                      │  IP: 192.168.1.100 (example)                 │
                      │  - FastAPI Backend (Port 8000)               │
                      │  - SQLite Database (`pcclub.db`)             │
                      │  - Real-Time WebSocket Telemetry Registry    │
                      │  - Cashier Management Map (`/admin`)         │
                      └──────────────────────┬───────────────────────┘
                                             │ Local Club Network (LAN / Wi-Fi)
             ┌───────────────────────────────┼───────────────────────────────┐
             │                               │                               │
  ┌──────────▼──────────┐         ┌──────────▼──────────┐         ┌──────────▼──────────┐
  │     GAMING PC #1    │         │     GAMING PC #2    │         │     GAMING PC #10   │
  │  IP: 192.168.1.101  │         │  IP: 192.168.1.102  │         │  IP: 192.168.1.110  │
  │  `pcId`: 1          │         │  `pcId`: 2          │         │  `pcId`: 10         │
  │  Kiosk Client (.exe)│         │  Kiosk Client (.exe)│         │  Kiosk Client (.exe)│
  └─────────────────────┘         └─────────────────────┘         └─────────────────────┘
```

---

## 🖥️ Step 1: Set Up & Start the Club Server

On the computer that acts as the **Server / Cashier PC**:

### 1. Find Your Server's LAN IP Address
Open PowerShell or Command Prompt on the Server PC:
```powershell
ipconfig
```
Look for **IPv4 Address** under your active Ethernet or Wi-Fi adapter (e.g., `192.168.1.100`).

### 2. Start the Backend Server
Run the automated batch file:
```bat
start-backend.bat
```
Or manually run:
```powershell
cd backend
$env:PYTHONPATH = "backend"
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend --reload
```
> [!NOTE]
> Binding to `--host 0.0.0.0` allows remote client PCs on the club LAN to connect over port 8000.
> Ensure Windows Firewall allows incoming connections on port 8000:
> `New-NetFirewallRule -DisplayName "PC Club Server Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow`

---

## 🎮 Step 2: Deploy Client Software on Gaming PCs

### Option A: Using the Standalone Build (`win-unpacked`)
1. On the build machine, navigate to:
   ```
   desktop/release/win-unpacked/
   ```
2. Copy this entire folder (or share it via local network share `\\SERVER\pcclub`) onto each gaming station (e.g. `C:\PCClub\`).
3. In that folder, open **`config.json`** with Notepad and configure the station:

```json
{
  "serverIp": "192.168.1.100",
  "serverPort": 8000,
  "pcId": 1,
  "pcLabel": "PC #1",
  "authToken": "dev-pc-token"
}
```
*Change `pcId: 1` to `2`, `3`, `4`, etc. for each respective gaming station.*

4. Launch **`PC Club Kiosk.exe`**.

### Option B: Developer / Testing Mode (`electron:dev`)
If developing locally on a station:
```powershell
cd desktop
npm run electron:dev
```

---

## 🌐 In-App Browser & Platform Restrictions

The client includes an **In-App Browser** (`IN-APP BROWSER (RUNS INSIDE)`) supporting:
- **YouTube** (`https://www.youtube.com`)
- **Twitch** (`https://www.twitch.tv`)
- **Discord** (`https://discord.com/app`)
- **Telegram Web A** (`https://web.telegram.org/a/`) — Modern responsive client
- **Telegram Web K** (`https://web.telegram.org/k/`) — Classic fast client
- **Speedtest** (`https://fast.com`)

### ⚠️ Why Did Telegram Web Show a Blank Screen Earlier?
1. **User-Agent Blocking**: By default, Electron sends `Electron/x.x.x` in the `User-Agent`. Major platforms like **Telegram Web** and **Discord** detect this string and immediately refuse to render, resulting in a blank screen.
   - *Fix applied*: The app now automatically masks the User-Agent as a clean standard Chrome browser (`Mozilla/5.0 ... Chrome/128.0.0.0 Safari/537.36`).
2. **Persistent Login Session**: The in-app browser runs in an isolated, persistent partition (`persist:senet_browser`), keeping players' Telegram and Discord logins active during their session without polluting the system.
3. **Browser Mode Fallback**: If you open the web UI inside a normal browser (like Chrome at `http://localhost:5173`) instead of the Electron desktop app, Chrome's built-in iframe policy will block Telegram (`X-Frame-Options: SAMEORIGIN`). When run in a web browser, the app now shows an informative notice and a 1-click **Open in New Tab** button.
4. **Native Browser**: Players or staff can also click **`OPEN IN CHROME`** at any time to launch the native system Google Chrome or Microsoft Edge browser.

---

## 👩‍💼 Step 3: Dedicated Cashier / Admin Desktop App (`admin-desktop`)

We provide a dedicated **Admin Management Desktop App** (`admin-desktop`) designed for the cashier desk, owner's laptop, or administrative workstation:

### 1. Launching on the Cash Desk PC
- Standalone Portable Executable:
  ```
  admin-desktop\release\PCClub-Admin-Setup.exe
  ```
- Or unpacked folder:
  ```
  admin-desktop\release\win-unpacked\PC Club Admin Console.exe
  ```
- Configure `config.json` next to the executable (or click **`⚙️ Server`** inside the app):
  ```json
  {
    "serverIp": "10.72.49.124",
    "serverPort": 8000,
    "clubName": "CYBER ARENA CLUB",
    "cashierName": "Operator"
  }
  ```

### 2. Cashier Console Features
- **Real-Time Interactive PC Grid:** Free (Green), Busy (Red with live countdown), Alert (Pulsing Yellow), Offline (Gray).
- **Remote Unlock:** Choose gamer username and tariff duration (+1h, +2h, +3h, Night Pass) to remotely start station sessions.
- **Remote Add Time:** Extend sessions with 1 click (+30m, +1h).
- **Force Lock & Process Killer:** Immediately kill game processes via Windows `taskkill` and restore the fullscreen lock shield.
- **Hardware Telemetry & Process Monitoring:** Live CPU load, RAM usage, GPU utilization, and active game process names reported over LAN.
- **Remote Power Control:** Initiate remote **Reboot** or **Shutdown** on any client PC.
- **Dispatch Alert Drawer:** Audio chime and live notification feed when any player presses "Call Admin" or orders food/snacks from their station.

---

## 🚨 Emergency Exit & Keyboard Shortcuts

- **Emergency Developer Exit:** Press **`Ctrl + Shift + Q`** at any time to close the locked kiosk window and return to Windows desktop.
- While locked, common bypass shortcuts like `Alt + F4`, `Alt + Tab`, `Ctrl + Esc`, and `Windows Key` are blocked to prevent unauthorized access.
