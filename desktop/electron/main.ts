import { app, BrowserWindow, globalShortcut, ipcMain, shell, session, clipboard } from 'electron';
import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let isKioskLocked = true;
let isMaintenanceMode = false;
let isAppQuitting = false;
let lastCpuInfo = os.cpus();
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

function calculateCpuUsage(): number {
  const currentCpus = os.cpus();
  let totalDiff = 0;
  let idleDiff = 0;

  for (let i = 0; i < currentCpus.length; i++) {
    const prev = lastCpuInfo[i]?.times || currentCpus[i].times;
    const curr = currentCpus[i].times;
    const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq;
    const currTotal = curr.user + curr.nice + curr.sys + curr.idle + curr.irq;
    totalDiff += currTotal - prevTotal;
    idleDiff += curr.idle - prev.idle;
  }
  lastCpuInfo = currentCpus;
  if (totalDiff <= 0) return 6;
  const usage = Math.round((1 - idleDiff / totalDiff) * 100);
  return Math.max(1, Math.min(100, usage));
}

function getActivePowerPlan(): Promise<string> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve('Balanced');
    exec('powercfg /getactivescheme', (err, stdout) => {
      if (err || !stdout) return resolve('Balanced');
      if (stdout.includes('8c5e7fda') || /high performance|turbo|производительность/i.test(stdout)) {
        return resolve('High Performance');
      }
      if (stdout.includes('a1841308') || /power saver|saver|экономия/i.test(stdout)) {
        return resolve('Power Saver');
      }
      return resolve('Balanced');
    });
  });
}

function setWindowsPowerPlan(
  plan: 'high_performance' | 'balanced' | 'power_saver',
): Promise<{ success: boolean; plan: string; message: string }> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: true, plan, message: 'Simulated on non-Windows platform' });
    }
    // Well-known Windows powercfg GUIDs
    let guid = '381b4222-f694-41f0-9685-ff5bb260df2e'; // Balanced
    if (plan === 'high_performance') guid = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';
    else if (plan === 'power_saver') guid = 'a1841308-3541-4fab-bc81-f71556f20b4a';

    exec(`powercfg /setactive ${guid}`, (err) => {
      if (err) {
        console.warn('[SENET PowerPlan] Failed to set power scheme:', err);
        return resolve({ success: false, plan, message: err.message });
      }
      console.log(`[SENET PowerPlan] Successfully switched Windows scheme to: ${plan} (${guid})`);
      resolve({ success: true, plan, message: `Active power plan set to ${plan}` });
    });
  });
}

function getRunningProcessesList(): Promise<Array<{ name: string; pid: number; memoryMb: number }>> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve([
        { name: 'chrome.exe', pid: 1042, memoryMb: 450 },
        { name: 'steam.exe', pid: 2110, memoryMb: 280 },
        { name: 'Discord.exe', pid: 3204, memoryMb: 190 },
      ]);
    }
    exec('tasklist /FO CSV /NH', (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const lines = stdout.split('\r\n').filter(Boolean);
      const procs: Array<{ name: string; pid: number; memoryMb: number }> = [];
      for (const line of lines) {
        const parts = line.split('","').map((p) => p.replace(/"/g, ''));
        if (parts.length >= 5) {
          const name = parts[0];
          const pid = parseInt(parts[1], 10);
          const memRaw = parts[4].replace(/[^\d]/g, '');
          const memoryMb = Math.round((parseInt(memRaw, 10) || 0) / 1024);
          if (
            !['System Idle Process', 'System', 'Registry', 'smss.exe', 'csrss.exe', 'wininit.exe', 'services.exe'].includes(
              name,
            ) &&
            memoryMb >= 10
          ) {
            procs.push({ name, pid, memoryMb });
          }
        }
      }
      procs.sort((a, b) => b.memoryMb - a.memoryMb);
      resolve(procs.slice(0, 15));
    });
  });
}

function getPrimaryMacAddress(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const net = interfaces[name];
      if (net) {
        for (const item of net) {
          if (!item.internal && item.mac && item.mac !== '00:00:00:00:00:00') {
            return item.mac;
          }
        }
      }
    }
  } catch {
    // fallback
  }
  return '00:1A:2B:3C:4D:5E';
}

function cleanSessionData(): void {
  try {
    clipboard.clear();
    console.log('[SENET Cleanup] System clipboard cleared.');
    session.defaultSession.clearCache().catch(() => {});
    session.fromPartition('persist:senet_browser').clearStorageData().catch(() => {});
    console.log('[SENET Cleanup] Browser cache and temporary session files cleared.');
  } catch (err) {
    console.warn('[SENET Cleanup] Warning during session clean:', err);
  }
}

function setMaintenanceMode(enabled: boolean): void {
  isMaintenanceMode = enabled;
  if (mainWindow) {
    if (enabled) {
      mainWindow.setKiosk(false);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setFullScreen(false);
      mainWindow.minimize();
      console.log('[SENET Maintenance] Maintenance Mode ACTIVATED (Kiosk unlocked for technician)');
    } else {
      mainWindow.restore();
      mainWindow.setKiosk(true);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.setFullScreen(true);
      mainWindow.focus();
      console.log('[SENET Maintenance] Kiosk Protection Mode RESTORED');
    }
  }
}

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

  // Watchdog auto-recovery handler: respawn if renderer crashes or is closed outside maintenance mode
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[SENET Watchdog] Renderer process gone (${details.reason}, exitCode: ${details.exitCode})`);
    if (!isMaintenanceMode && !isAppQuitting) {
      console.log('[SENET Watchdog] Respawing Lock Screen window immediately...');
      setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          createWindow();
        } else {
          mainWindow.reload();
        }
      }, 500);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (!isMaintenanceMode && !isAppQuitting) {
      console.log('[SENET Watchdog] Window closed unexpectedly -> Respawning kiosk window...');
      setTimeout(() => {
        if (!isAppQuitting) {
          createWindow();
        }
      }, 500);
    }
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

  // 3. Post-session cleanup: clear clipboard and browser storage
  cleanSessionData();

  // 4. Force lock state and re-assert topmost kiosk window
  isKioskLocked = true;
  if (mainWindow && !isMaintenanceMode) {
    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.focus();
  }

  return { success: true };
});

ipcMain.handle('get-real-telemetry', async () => {
  const cpu_usage = calculateCpuUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memory_usage = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const power_plan = await getActivePowerPlan();
  const processes = await getRunningProcessesList();
  const mac_address = getPrimaryMacAddress();

  return {
    cpu_usage,
    memory_usage,
    power_plan,
    processes,
    mac_address,
    maintenance_mode: isMaintenanceMode,
  };
});

ipcMain.handle('set-power-plan', async (_event, plan: 'high_performance' | 'balanced' | 'power_saver') => {
  return await setWindowsPowerPlan(plan);
});

ipcMain.handle('kill-process', async (_event, { pid, name }: { pid?: number; name?: string }) => {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const cmd = pid ? `taskkill /F /PID ${pid}` : name ? `taskkill /F /IM ${name}` : null;
      if (!cmd) return resolve({ success: false, error: 'No pid or process name provided' });
      exec(cmd, (err) => {
        if (err) return resolve({ success: false, error: err.message });
        resolve({ success: true });
      });
    } else {
      if (pid) {
        try {
          process.kill(pid, 'SIGKILL');
          return resolve({ success: true });
        } catch (e: any) {
          return resolve({ success: false, error: e.message });
        }
      }
      resolve({ success: false, error: 'PID required on non-Windows platform' });
    }
  });
});

ipcMain.handle('set-maintenance-mode', async (_event, enabled: boolean) => {
  setMaintenanceMode(enabled);
  return { success: true, maintenance_mode: enabled };
});

ipcMain.handle('clean-session-data', async () => {
  cleanSessionData();
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

ipcMain.handle('system-reboot', async () => {
  console.log('[SENET IPC] Remote REBOOT executed by Club Admin...');
  if (process.platform === 'win32') {
    spawn('shutdown', ['/r', '/t', '0'], { stdio: 'ignore' });
  }
  return { success: true };
});

ipcMain.handle('system-shutdown', async () => {
  console.log('[SENET IPC] Remote SHUTDOWN executed by Club Admin...');
  if (process.platform === 'win32') {
    spawn('shutdown', ['/s', '/t', '0'], { stdio: 'ignore' });
  }
  return { success: true };
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

app.on('before-quit', () => {
  isAppQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
