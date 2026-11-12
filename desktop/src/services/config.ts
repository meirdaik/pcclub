import { AppConfig } from '../types';

let cachedConfig: AppConfig = {
  serverIp: window.location.hostname && window.location.hostname !== 'localhost' ? window.location.hostname : '127.0.0.1',
  serverPort: 8000,
  serverUrl: `http://${window.location.hostname && window.location.hostname !== 'localhost' ? window.location.hostname : '127.0.0.1'}:8000`,
  wsUrl: `ws://${window.location.hostname && window.location.hostname !== 'localhost' ? window.location.hostname : '127.0.0.1'}:8000`,
  pcId: 'pc-001',
  pcNumber: 1,
  pcLabel: 'PC #1',
  authToken: 'dev-pc-token',
};

export async function initAppConfig(): Promise<AppConfig> {
  if (window.electronAPI?.getConfig) {
    try {
      const cfg = await window.electronAPI.getConfig();
      cachedConfig = cfg;
      console.log('[Config] Initialized configuration from Electron:', cfg);
      return cfg;
    } catch (err) {
      console.warn('[Config] Error loading electron config:', err);
    }
  }

  // Parse URL query parameters if present (e.g. ?pc_id=pc-002&server_ip=192.168.1.50)
  const params = new URLSearchParams(window.location.search);
  const qServerIp =
    params.get('server_ip') ||
    params.get('serverIp') ||
    (window.location.hostname && window.location.hostname !== 'localhost'
      ? window.location.hostname
      : '127.0.0.1');
  const qServerPort = Number(params.get('server_port') || params.get('serverPort') || 8000);
  const qPcId = params.get('pc_id') || params.get('pcId') || 'pc-001';
  const qPcLabel =
    params.get('pc_label') ||
    params.get('pcLabel') ||
    `PC #${qPcId.replace(/\D/g, '') || '1'}`;

  cachedConfig = {
    serverIp: qServerIp,
    serverPort: qServerPort,
    serverUrl: `http://${qServerIp}:${qServerPort}`,
    wsUrl: `ws://${qServerIp}:${qServerPort}`,
    pcId: qPcId,
    pcNumber: Number(qPcId.replace(/\D/g, '') || 1),
    pcLabel: qPcLabel,
    authToken: 'dev-pc-token',
  };

  console.log('[Config] Initialized configuration from Environment/URL:', cachedConfig);
  return cachedConfig;
}

export function getAppConfig(): AppConfig {
  return cachedConfig;
}
