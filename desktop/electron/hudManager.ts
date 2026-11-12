import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';

class HudManager {
  private hudWindow: BrowserWindow | null = null;
  private onActionCallback: ((action: string) => void) | null = null;

  createHudWindow(onAction: (action: string) => void): BrowserWindow {
    this.onActionCallback = onAction;

    if (this.hudWindow && !this.hudWindow.isDestroyed()) {
      return this.hudWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const hudWidth = 460;
    const hudHeight = 44;
    const x = Math.round((screenWidth - hudWidth) / 2);
    const y = 8;

    this.hudWindow = new BrowserWindow({
      width: hudWidth,
      height: hudHeight,
      x,
      y,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    this.hudWindow.setAlwaysOnTop(true, 'screen-saver', 2);
    this.hudWindow.setVisibleOnAllWorkspaces(true);

    const hudHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      background: rgba(7, 9, 19, 0.92);
      border: 1px solid #00f0ff;
      border-radius: 22px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
      box-shadow: 0 0 18px rgba(0, 240, 255, 0.4);
      -webkit-app-region: drag;
    }
    .badge {
      font-weight: 900;
      font-size: 11px;
      color: #00f0ff;
      letter-spacing: 1px;
      background: rgba(0, 240, 255, 0.15);
      padding: 3px 8px;
      border-radius: 10px;
    }
    .timer {
      font-weight: 900;
      font-size: 14px;
      color: #00ff88;
      font-family: monospace;
      letter-spacing: 0.5px;
    }
    .timer.warning { color: #ffaa00; }
    .timer.danger { color: #ff0055; animation: pulse 1s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
    .btn-group {
      display: flex;
      gap: 6px;
      -webkit-app-region: no-drag;
    }
    button {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #e2e8f0;
      padding: 4px 9px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.15s;
    }
    button:hover {
      background: #00f0ff;
      color: #070913;
      border-color: #00f0ff;
    }
    button.danger:hover {
      background: #ff0055;
      color: #fff;
      border-color: #ff0055;
    }
  </style>
</head>
<body>
  <span class="badge" id="pcBadge">PC #1</span>
  <span class="timer" id="timer">--:--:--</span>
  <div class="btn-group">
    <button onclick="sendAction('return-launcher')">🖥️ LAUNCHER</button>
    <button onclick="sendAction('call-admin')">🚨 HELP</button>
    <button class="danger" onclick="sendAction('end-session')">🔒 END</button>
  </div>

  <script>
    const { ipcRenderer } = require('electron');
    let remSec = 0;

    function formatTime(sec) {
      if (sec <= 0) return '00:00:00';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    ipcRenderer.on('hud-update', (event, data) => {
      if (data.pcLabel) document.getElementById('pcBadge').textContent = data.pcLabel;
      if (data.remainingSeconds !== undefined) {
        remSec = data.remainingSeconds;
        const el = document.getElementById('timer');
        el.textContent = formatTime(remSec);
        el.className = 'timer' + (remSec < 60 ? ' danger' : remSec < 300 ? ' warning' : '');
      }
    });

    setInterval(() => {
      if (remSec > 0) {
        remSec = Math.max(0, remSec - 1);
        const el = document.getElementById('timer');
        el.textContent = formatTime(remSec);
        el.className = 'timer' + (remSec < 60 ? ' danger' : remSec < 300 ? ' warning' : '');
      }
    }, 1000);

    function sendAction(action) {
      ipcRenderer.send('hud-action', action);
    }
  </script>
</body>
</html>
    `;

    this.hudWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(hudHtml)}`);
    this.hudWindow.hide(); // Hidden by default until player session starts

    ipcMain.on('hud-action', (_event, action: string) => {
      if (this.onActionCallback) {
        this.onActionCallback(action);
      }
    });

    return this.hudWindow;
  }

  show(): void {
    if (this.hudWindow && !this.hudWindow.isDestroyed()) {
      this.hudWindow.show();
      this.hudWindow.setAlwaysOnTop(true, 'screen-saver', 2);
    }
  }

  hide(): void {
    if (this.hudWindow && !this.hudWindow.isDestroyed()) {
      this.hudWindow.hide();
    }
  }

  updateState(state: { pcLabel?: string; remainingSeconds?: number; username?: string }): void {
    if (this.hudWindow && !this.hudWindow.isDestroyed()) {
      this.hudWindow.webContents.send('hud-update', state);
    }
  }

  destroy(): void {
    if (this.hudWindow && !this.hudWindow.isDestroyed()) {
      this.hudWindow.destroy();
      this.hudWindow = null;
    }
  }
}

export const hudManager = new HudManager();
