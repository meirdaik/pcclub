import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';

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
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
    // Uncomment for dev debugging if needed:
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
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

ipcMain.handle('launch-app', async (_event, exePath: string) => {
  console.log(`[IPC] Request to launch: ${exePath}`);
  return new Promise((resolve) => {
    try {
      // Launch external game / executable detached from the kiosk process
      const child = spawn(exePath, [], {
        detached: true,
        stdio: 'ignore',
        shell: true,
      });

      child.unref();

      child.on('error', (err) => {
        console.error(`[IPC] Failed to launch ${exePath}:`, err);
        resolve({ success: false, error: err.message });
      });

      // If no immediate error, consider process successfully spawned
      setTimeout(() => {
        resolve({ success: true });
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[IPC] Exception launching ${exePath}:`, msg);
      resolve({ success: false, error: msg });
    }
  });
});

ipcMain.handle('get-pc-info', async () => {
  return {
    pcId: process.env.VITE_PC_ID || 'pc-001',
    pcLabel: process.env.VITE_PC_LABEL || 'PC #1',
  };
});

ipcMain.on('exit-kiosk', () => {
  console.log('[IPC] Exit kiosk requested');
  app.quit();
});

// ----------------------------------------------------------------------
// App Lifecycle & Developer Exit Shortcut (Ctrl+Shift+Q)
// ----------------------------------------------------------------------

app.whenReady().then(() => {
  createWindow();

  // Register safe developer exit shortcut: Ctrl+Shift+Q
  const registered = globalShortcut.register('CommandOrControl+Shift+Q', () => {
    console.log('[Shortcut] Ctrl+Shift+Q detected -> Exiting Kiosk...');
    app.quit();
  });

  if (!registered) {
    console.warn('[Shortcut] Failed to register Ctrl+Shift+Q');
  } else {
    console.log('[Shortcut] Registered Ctrl+Shift+Q developer exit shortcut');
  }

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
