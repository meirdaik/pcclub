import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

interface AdminConfig {
  serverIp: string;
  serverPort: number;
  clubName: string;
  cashierName: string;
  authToken: string;
  pollIntervalMs: number;
}

let mainWindow: BrowserWindow | null = null;

function getConfigPath(): string {
  const candidates = [
    path.join(path.dirname(process.execPath), 'config.json'),
    path.join(process.resourcesPath || '', 'config.json'),
    path.join(process.cwd(), 'config.json'),
    path.join(__dirname, '..', 'config.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return app.isPackaged
    ? path.join(path.dirname(process.execPath), 'config.json')
    : path.join(process.cwd(), 'config.json');
}

function loadAdminConfig(): AdminConfig {
  const defaultCfg: AdminConfig = {
    serverIp: '10.72.49.124',
    serverPort: 8000,
    clubName: 'CYBER ARENA CLUB',
    cashierName: 'Operator',
    authToken: 'dev-pc-token',
    pollIntervalMs: 2000,
  };

  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...defaultCfg, ...data };
    }
  } catch (err) {
    console.warn('[Admin Electron] Failed to read config:', err);
  }

  // Auto-generate template
  try {
    fs.writeFileSync(configPath, JSON.stringify(defaultCfg, null, 2), 'utf-8');
  } catch {
    // Ignore if unwritable
  }

  return defaultCfg;
}

let activeConfig = loadAdminConfig();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    frame: true,
    title: `${activeConfig.clubName} - Admin & Cashier Console`,
    backgroundColor: '#070913',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5174';
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  const queryParams = new URLSearchParams({
    server_ip: activeConfig.serverIp,
    server_port: String(activeConfig.serverPort),
    club_name: activeConfig.clubName,
    cashier_name: activeConfig.cashierName,
    auth_token: activeConfig.authToken,
    poll_ms: String(activeConfig.pollIntervalMs),
  }).toString();

  if (isDev) {
    mainWindow.loadURL(`${devServerUrl}?${queryParams}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      search: queryParams,
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-config', () => {
  return activeConfig;
});

ipcMain.handle('save-config', (_event, newConfig: Partial<AdminConfig>) => {
  activeConfig = { ...activeConfig, ...newConfig };
  const targetPath = getConfigPath();
  try {
    fs.writeFileSync(targetPath, JSON.stringify(activeConfig, null, 2), 'utf-8');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
});

ipcMain.on('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow?.close();
});

ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url);
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
