export type AppState = 'locked' | 'unlocked' | 'admin';

export interface SessionInfo {
  username: string;
  remainingSeconds: number;
  balanceKzt?: number;
  isAdmin?: boolean;
}

export interface ServerMessage {
  action?: 'UNLOCK' | 'LOCK' | 'EXTEND' | string;
  type?: 'auth_ok' | 'heartbeat_ack' | 'alert_received' | string;
  username?: string;
  remaining_seconds?: number;
  added_seconds?: number;
  is_admin?: boolean;
  balance?: number;
  [key: string]: unknown;
}

export interface ClientMessage {
  type: 'auth' | 'heartbeat' | 'status' | 'call_admin' | 'order_snack' | 'clear_alert';
  token?: string;
  pc_id?: string;
  status?: string;
  remaining_seconds?: number;
  active_game?: string;
  current_user?: string;
  message?: string;
  description?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface GameItem {
  id: string;
  name: string;
  category: 'Popular' | 'Steam' | 'Shooter' | 'MOBA' | 'App';
  icon: string;
  exePath: string;
  uriScheme?: string;
  banner?: string;
  popular?: boolean;
  isWebEmbed?: boolean;
  embedUrl?: string;
}

export interface CartItem {
  id: string;
  name: string;
  priceKzt: number;
  quantity: number;
  category: string;
  imageEmoji: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Drinks' | 'Snacks' | 'Hot Meals' | 'Combos';
  priceKzt: number;
  imageEmoji: string;
  description: string;
}

export interface SystemStats {
  pcId: string;
  pcLabel: string;
  hostname: string;
  osRelease: string;
  totalMemoryGb: number;
  freeMemoryGb: number;
  cpuModel: string;
}

export interface AdminPcItem {
  id: string;
  pc_id: string;
  label: string;
  name: string;
  zone: string;
  status: 'FREE' | 'BUSY' | 'OFFLINE' | 'ALERT';
  online: boolean;
  current_user?: string | null;
  remaining_seconds: number;
  current_game?: string | null;
  alert?: string | null;
  specs?: Record<string, any>;
}

export interface AdminTariffItem {
  id: string;
  name: string;
  zone: string;
  duration_minutes: number;
  price_kzt: number;
}

export interface AppConfig {
  serverIp: string;
  serverPort: number;
  serverUrl: string;
  wsUrl: string;
  pcId: string;
  pcNumber: number;
  pcLabel: string;
  authToken: string;
}

export interface ElectronAPI {
  getConfig: () => Promise<AppConfig>;
  launchApp: (exePathOrUri: string) => Promise<{ success: boolean; error?: string }>;
  getPcInfo: () => Promise<{ pcId: string; pcLabel: string }>;
  getSystemStats: () => Promise<SystemStats>;
  minimizeWindow: () => void;
  restoreWindow: () => void;
  setKioskMode: (enabled: boolean) => void;
  setKioskLocked: (locked: boolean) => void;
  killGameProcesses: () => Promise<{ success: boolean }>;
  openExternal: (url: string) => void;
  exitKiosk: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __APP_CONFIG__?: AppConfig;
  }
}
