export type AppState = 'locked' | 'unlocked';

export interface SessionInfo {
  username: string;
  remainingSeconds: number;
  balanceKzt?: number;
}

export interface ServerMessage {
  action?: 'UNLOCK' | 'LOCK' | string;
  type?: 'auth_ok' | 'heartbeat_ack' | string;
  username?: string;
  remaining_seconds?: number;
  [key: string]: unknown;
}

export interface ClientMessage {
  type: 'auth' | 'heartbeat' | 'status';
  token?: string;
  status?: string;
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

export interface ElectronAPI {
  launchApp: (exePathOrUri: string) => Promise<{ success: boolean; error?: string }>;
  getPcInfo: () => Promise<{ pcId: string; pcLabel: string }>;
  getSystemStats: () => Promise<SystemStats>;
  minimizeWindow: () => void;
  restoreWindow: () => void;
  setKioskMode: (enabled: boolean) => void;
  openExternal: (url: string) => void;
  exitKiosk: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
