import { AdminConfig } from '../types';

let cachedConfig: AdminConfig = {
  serverIp: '127.0.0.1',
  serverPort: 8000,
  serverUrl: 'http://127.0.0.1:8000',
  clubName: 'CYBER ARENA CLUB',
  cashierName: 'Operator',
  authToken: 'dev-pc-token',
  pollIntervalMs: 2000,
};

export async function initAdminConfig(): Promise<AdminConfig> {
  // 1. Try Electron IPC
  if (window.adminAPI?.getConfig) {
    try {
      const ipcCfg = await window.adminAPI.getConfig();
      if (ipcCfg && ipcCfg.serverIp) {
        cachedConfig = {
          ...cachedConfig,
          ...ipcCfg,
          serverUrl: `http://${ipcCfg.serverIp}:${ipcCfg.serverPort || 8000}`,
        };
        return cachedConfig;
      }
    } catch (err) {
      console.warn('[AdminConfig] IPC getConfig failed, checking URL params:', err);
    }
  }

  // 2. Try URL search params
  const params = new URLSearchParams(window.location.search);
  const sIp = params.get('server_ip');
  const sPort = params.get('server_port');
  const clubName = params.get('club_name');
  const cashierName = params.get('cashier_name');
  const token = params.get('auth_token');
  const poll = params.get('poll_ms');

  if (sIp) {
    cachedConfig.serverIp = sIp;
    cachedConfig.serverPort = sPort ? Number(sPort) : 8000;
    cachedConfig.serverUrl = `http://${cachedConfig.serverIp}:${cachedConfig.serverPort}`;
  }
  if (clubName) cachedConfig.clubName = clubName;
  if (cashierName) cachedConfig.cashierName = cashierName;
  if (token) cachedConfig.authToken = token;
  if (poll) cachedConfig.pollIntervalMs = Number(poll);

  return cachedConfig;
}

export function getAdminConfig(): AdminConfig {
  return cachedConfig;
}

export async function updateAdminConfig(newPartial: Partial<AdminConfig>): Promise<boolean> {
  cachedConfig = {
    ...cachedConfig,
    ...newPartial,
    serverUrl: `http://${newPartial.serverIp || cachedConfig.serverIp}:${newPartial.serverPort || cachedConfig.serverPort}`,
  };

  if (window.adminAPI?.saveConfig) {
    try {
      const res = await window.adminAPI.saveConfig(cachedConfig);
      return res.success;
    } catch {
      return false;
    }
  }
  return true;
}
