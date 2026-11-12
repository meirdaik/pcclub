import { app, BrowserWindow, globalShortcut, ipcMain, shell, session } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let isKioskLocked = true;
const trackedPids = new Set<number>();

// ----------------------------------------------------------------------
// Runtime Configuration (config.json)
// ----------------------------------------------------------------------

interface RuntimeConfig {
  serverIp: string;
  serverPort: number;
  serverUrl: string;
  wsUrl: string;
  pcId: string;
  pcNumber: number;
  pcLabel: string;
  authToken: string;
}

function loadAppConfig(): RuntimeConfig {
  const candidatePaths = [
    // 1. Next to the executable when packaged (e.g. C:\PCClubClient\config.json)
    path.join(path.dirname(process.execPath), 'config.json'),
    // 2. In electron extraResources folder
    path.join(process.resourcesPath, 'config.json'),
    // 3. Current working directory
    path.join(process.cwd(), 'config.json'),
    // 4. In desktop root (development)
    path.join(__dirname, '../config.json'),
    path.join(__dirname, 'config.json'),
  ];

  let rawConfig: Record<string, unknown> = {};
  let resolvedPath: string | null = null;

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        const fileContent = fs.readFileSync(candidate, 'utf-8');
        rawConfig = JSON.parse(fileContent);
        resolvedPath = candidate;
        console.log(`[SENET Config] Successfully loaded config from: ${candidate}`);
        break;
      }
    } catch (err) {
      console.warn(`[SENET Config] Could not parse config at ${candidate}:`, err);
    }
  }

  const serverIp = String(rawConfig.serverIp || process.env.VITE_SERVER_IP || '127.0.0.1');
  const serverPort = Number(rawConfig.serverPort || process.env.VITE_SERVER_PORT || 8000);
  const pcNumber = Number(rawConfig.pcId || process.env.VITE_PC_NUMBER || 1);
  const pcId =
    typeof rawConfig.pcId === 'string' && rawConfig.pcId.startsWith('pc-')
      ? rawConfig.pcId
      : `pc-${String(pcNumber).padStart(3, '0')}`;
  const pcLabel = String(rawConfig.pcLabel || `PC #${pcNumber}`);
  const authToken = String(rawConfig.authToken || process.env.VITE_PC_AUTH_TOKEN || 'dev-pc-token');
  const serverUrl = `http://${serverIp}:${serverPort}`;
  const wsUrl = `ws://${serverIp}:${serverPort}`;

  const config: RuntimeConfig = {
    serverIp,
    serverPort,
    serverUrl,
    wsUrl,
    pcId,
    pcNumber,
    pcLabel,
    authToken,
  };

  // If no config.json was found on disk, auto-generate template for club admin
  if (!resolvedPath) {
    try {
      const templatePath = app.isPackaged
        ? path.join(path.dirname(process.execPath), 'config.json')
        : path.join(process.cwd(), 'config.json');

      fs.writeFileSync(
        templatePath,
        JSON.stringify(
          {
            serverIp,
            serverPort,
            pcId: pcNumber,
            pcLabel,
            authToken,
          },
          null,
          2,
        ),
        'utf-8',
      );
      console.log(`[SENET Config] Generated default template config at: ${templatePath}`);
    } catch {
      // Ignore if filesystem is read-only
    }
  }

  return config;
}

const appConfig = loadAppConfig();

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

  const queryParams = new URLSearchParams({
    pc_id: appConfig.pcId,
    pc_label: appConfig.pcLabel,
    server_ip: appConfig.serverIp,
    server_port: String(appConfig.serverPort),
    server_url: appConfig.serverUrl,
    ws_url: appConfig.wsUrl,
  }).toString();

  if (isDev) {
    mainWindow.loadURL(`${devServerUrl}?${queryParams}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: {
        pc_id: appConfig.pcId,
        pc_label: appConfig.pcLabel,
        server_ip: appConfig.serverIp,
        server_port: String(appConfig.serverPort),
        server_url: appConfig.serverUrl,
        ws_url: appConfig.wsUrl,
      },
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------------------------------------------------------------
// IPC Handlers
// ----------------------------------------------------------------------

ipcMain.handle('get-config', () => {
  return appConfig;
});

ipcMain.handle('get-pc-info', async () => {
  return {
    pcId: appConfig.pcId,
    pcLabel: appConfig.pcLabel,
  };
});

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

ipcMain.handle('get-system-stats', async () => {
  const totalMemGb = Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10;
  const freeMemGb = Math.round((os.freemem() / 1024 / 1024 / 1024) * 10) / 10;
  const cpuModel = os.cpus()[0]?.model || 'Gaming Multi-Core Processor';

  return {
    pcId: appConfig.pcId,
    pcLabel: appConfig.pcLabel,
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
  // Use clean standard Chrome User-Agent across sessions to avoid Electron blocking by Telegram, Discord, Google
  const CHROME_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

  session.defaultSession.setUserAgent(CHROME_USER_AGENT);

  // Dedicated persistent session for the in-kiosk web browser (keeps player logins alive)
  const browserSession = session.fromPartition('persist:senet_browser');
  browserSession.setUserAgent(CHROME_USER_AGENT);

  // Header stripper function allowing embedded web apps (Telegram, YouTube, Twitch, Discord)
  const stripFrameHeaders = (
    details: Electron.OnHeadersReceivedListenerDetails,
    callback: (response: Electron.HeadersReceivedResponse) => void,
  ) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    delete responseHeaders['cross-origin-opener-policy'];
    delete responseHeaders['Cross-Origin-Opener-Policy'];
    callback({ cancel: false, responseHeaders });
  };

  session.defaultSession.webRequest.onHeadersReceived(stripFrameHeaders);
  browserSession.webRequest.onHeadersReceived(stripFrameHeaders);

  // Configure all created guest webContents (webviews)
  app.on('web-contents-created', (_event, contents) => {
    contents.setUserAgent(CHROME_USER_AGENT);

    // Allow popups and window.open navigation within guest sessions
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return { action: 'allow' };
      }
      return { action: 'deny' };
    });
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
