import { app, BrowserWindow, globalShortcut, ipcMain, shell, session } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let isKioskLocked = true;
const trackedPids = new Set<number>();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    kiosk: true,
    alwaysOnTop: true,
    frame: false,
    fullscreen: true,
    backgroundColor: '#070913',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
  });

  // Lock escape combinations while in locked kiosk state (Ctrl+Shift+Q is preserved)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Preserve emergency developer exit: Ctrl+Shift+Q
    if (
      (input.control || input.meta) &&
      input.shift &&
      input.key.toLowerCase() === 'q'
    ) {
      return;
    }

    // When kiosk is locked, prevent Alt+F4, Alt+Tab, Windows Key, and Ctrl+Esc
    if (isKioskLocked) {
      if (input.key === 'Alt' || (input.alt && (input.key === 'F4' || input.key === 'Tab'))) {
        event.preventDefault();
      }
      if (input.key === 'Meta' || input.key === 'OS' || (input.control && input.key === 'Escape')) {
        event.preventDefault();
      }
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------------------------------------------------------------
// IPC Handlers
// ----------------------------------------------------------------------

ipcMain.handle('launch-app', async (_event, targetPathOrUri: string) => {
  console.log(`[SENET IPC] Request to launch: ${targetPathOrUri}`);

  // 1. If it's a URI scheme (steam://, https://, etc.)
  if (/^[a-zA-Z0-9+.-]+:\/\//.test(targetPathOrUri)) {
    try {
      await shell.openExternal(targetPathOrUri);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[SENET IPC] URI launch error: ${msg}`);
      return { success: false, error: msg };
    }
  }

  // 2. If it's an executable path, resolve candidate paths if missing
  let exePath = targetPathOrUri;
  if (!fs.existsSync(exePath)) {
    const candidates = [
      targetPathOrUri,
      // Steam candidates
      'C:\\Program Files (x86)\\Steam\\steam.exe',
      'C:\\Program Files\\Steam\\steam.exe',
      // Browser candidates
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      // Riot / Discord / Telegram
      'C:\\Riot Games\\Riot Client\\RiotClientServices.exe',
      path.join(os.homedir(), 'AppData\\Local\\Discord\\Update.exe'),
      path.join(os.homedir(), 'AppData\\Roaming\\Telegram Desktop\\Telegram.exe'),
      // Windows built-ins
      'C:\\Windows\\system32\\calc.exe',
      'C:\\Windows\\system32\\notepad.exe',
    ];

    const found = candidates.find((p) => fs.existsSync(p));
    if (found) {
      exePath = found;
      console.log(`[SENET IPC] Resolved to existing path: ${exePath}`);
    }
  }

  return new Promise((resolve) => {
    try {
      // In SENET mode: launch detached process so player plays natively
      const child = spawn(exePath, [], {
        detached: true,
        stdio: 'ignore',
        shell: true,
      });

      if (child.pid) {
        trackedPids.add(child.pid);
        console.log(`[SENET IPC] Tracked child PID: ${child.pid}`);
      }

      child.unref();

      child.on('error', (err) => {
        console.error(`[SENET IPC] Failed to execute ${exePath}:`, err);
        resolve({ success: false, error: err.message });
      });

      // When launching a native external game/app, temporarily allow game to be seen
      if (mainWindow) {
        mainWindow.setAlwaysOnTop(false);
      }

      setTimeout(() => {
        resolve({ success: true });
      }, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[SENET IPC] Spawn exception: ${msg}`);
      resolve({ success: false, error: msg });
    }
  });
});

ipcMain.handle('kill-game-processes', async () => {
  console.log('[SENET IPC] Terminating game and browser processes (Session Ended/Locked)...');

  // 1. Terminate tracked child PIDs
  for (const pid of trackedPids) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGKILL');
      }
    } catch {
      // Ignore if already terminated
    }
  }
  trackedPids.clear();

  // 2. Kill standard game & browser processes on Windows
  if (process.platform === 'win32') {
    const targets = [
      'cs2.exe',
      'dota2.exe',
      'steam.exe',
      'RiotClientServices.exe',
      'LeagueClient.exe',
      'VALORANT-Win64-Shipping.exe',
      'Discord.exe',
      'Telegram.exe',
      'chrome.exe',
      'msedge.exe',
      'calc.exe',
      'notepad.exe',
    ];
    for (const exe of targets) {
      try {
        spawn('taskkill', ['/F', '/IM', exe], { stdio: 'ignore' });
      } catch {
        // ignore errors for processes that were not running
      }
    }
  }

  // 3. Force lock state and re-assert topmost kiosk window
  isKioskLocked = true;
  if (mainWindow) {
    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.focus();
  }

  return { success: true };
});

ipcMain.on('set-kiosk-locked', (_event, locked: boolean) => {
  isKioskLocked = locked;
  if (mainWindow) {
    mainWindow.setKiosk(locked);
    mainWindow.setAlwaysOnTop(locked, locked ? 'screen-saver' : 'normal');
    if (locked) {
      mainWindow.focus();
    }
  }
});

ipcMain.handle('open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('get-pc-info', async () => {
  return {
    pcId: process.env.VITE_PC_ID || 'pc-001',
    pcLabel: process.env.VITE_PC_LABEL || 'PC #1',
  };
});

ipcMain.handle('get-system-stats', async () => {
  const totalMemGb = Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10;
  const freeMemGb = Math.round((os.freemem() / 1024 / 1024 / 1024) * 10) / 10;
  const cpuModel = os.cpus()[0]?.model || 'Gaming Multi-Core Processor';

  return {
    pcId: process.env.VITE_PC_ID || 'pc-001',
    pcLabel: process.env.VITE_PC_LABEL || 'PC #1',
    hostname: os.hostname(),
    osRelease: `Windows ${os.release()}`,
    totalMemoryGb: totalMemGb,
    freeMemoryGb: freeMemGb,
    cpuModel,
  };
});

ipcMain.on('set-kiosk-mode', (_event, enabled: boolean) => {
  if (mainWindow) {
    console.log(`[SENET] Kiosk mode set to: ${enabled}`);
    mainWindow.setKiosk(enabled);
    mainWindow.setAlwaysOnTop(enabled);
    if (enabled) {
      mainWindow.focus();
    }
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('restore-window', () => {
  if (mainWindow) {
    mainWindow.restore();
    mainWindow.focus();
  }
});

ipcMain.on('exit-kiosk', () => {
  console.log('[SENET IPC] Exit kiosk requested');
  app.quit();
});

// ----------------------------------------------------------------------
// App Lifecycle & Developer Exit Shortcut (Ctrl+Shift+Q)
// ----------------------------------------------------------------------

app.whenReady().then(() => {
  // Allow all embedded web apps by stripping X-Frame-Options & CSP headers on main window
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    delete responseHeaders['cross-origin-opener-policy'];
    delete responseHeaders['Cross-Origin-Opener-Policy'];
    callback({ cancel: false, responseHeaders });
  });

  // Also apply header stripping to all guest <webview> sessions
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      contents.session.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };
        delete responseHeaders['x-frame-options'];
        delete responseHeaders['X-Frame-Options'];
        delete responseHeaders['content-security-policy'];
        delete responseHeaders['Content-Security-Policy'];
        delete responseHeaders['cross-origin-opener-policy'];
        delete responseHeaders['Cross-Origin-Opener-Policy'];
        callback({ cancel: false, responseHeaders });
      });
    }
  });

  createWindow();

  // Register safe developer emergency exit shortcut: Ctrl+Shift+Q
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    console.log('[Shortcut] Ctrl+Shift+Q detected -> Exiting Kiosk...');
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
