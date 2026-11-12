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
  category: string;
  icon: string;
  banner?: string;
  exePath: string;
  popular?: boolean;
}

export interface ElectronAPI {
  launchApp: (exePath: string) => Promise<{ success: boolean; error?: string }>;
  getPcInfo: () => Promise<{ pcId: string; pcLabel: string }>;
  exitKiosk: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
