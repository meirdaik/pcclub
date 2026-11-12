import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

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
      // Riot / Discord
      'C:\\Riot Games\\Riot Client\\RiotClientServices.exe',
      path.join(os.homedir(), 'AppData\\Local\\Discord\\Update.exe'),
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

      child.unref();

      child.on('error', (err) => {
        console.error(`[SENET IPC] Failed to execute ${exePath}:`, err);
        resolve({ success: false, error: err.message });
      });

      // When launching a native external app, temporarily lower alwaysOnTop so game is visible
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
  createWindow();

  // Register safe developer exit shortcut: Ctrl+Shift+Q
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
