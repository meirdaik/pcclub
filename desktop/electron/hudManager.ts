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
    const hudWidth = 490;
    const hudHeight = 46;
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
      background: rgba(8, 12, 26, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 240, 255, 0.35);
      border-radius: 23px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 240, 255, 0.25);
      -webkit-app-region: drag;
      cursor: grab;
    }
    .left-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00f0ff;
      box-shadow: 0 0 10px #00f0ff;
      animation: pulseGlow 1.8s infinite;
    }
    @keyframes pulseGlow {
      0% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.15); }
      100% { opacity: 0.4; transform: scale(0.9); }
    }
    .badge {
      font-weight: 900;
      font-size: 11px;
      color: #00f0ff;
      letter-spacing: 1.5px;
      font-family: monospace;
    }
    .timer-container {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.3);
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .timer {
      font-weight: 900;
      font-size: 13px;
      color: #00ff88;
      font-family: monospace;
      letter-spacing: 0.5px;
      text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
    }
    .timer.warning { color: #ffaa00; text-shadow: 0 0 8px rgba(255, 170, 0, 0.6); }
    .timer.danger { color: #ff0055; text-shadow: 0 0 12px rgba(255, 0, 85, 0.8); animation: pulseDanger 1s infinite; }
    @keyframes pulseDanger { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }
    .btn-group {
      display: flex;
      gap: 6px;
      -webkit-app-region: no-drag;
    }
    button {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
      padding: 5px 11px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    button:hover {
      background: #00f0ff;
      color: #070913;
      border-color: #00f0ff;
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.6);
      transform: translateY(-1px);
    }
    button.danger:hover {
      background: #ff0055;
      color: #fff;
      border-color: #ff0055;
      box-shadow: 0 0 12px rgba(255, 0, 85, 0.6);
    }
  </style>
</head>
<body>
  <div class="left-group">
    <div class="pulse-dot"></div>
    <span class="badge" id="pcBadge">PC #1</span>
  </div>

  <div class="timer-container">
    <span class="timer" id="timer">--:--:--</span>
  </div>

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
