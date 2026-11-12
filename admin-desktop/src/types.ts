export type PcStatus = 'FREE' | 'BUSY' | 'ALERT' | 'OFFLINE';

export interface PcHardwareSpecs {
  cpu?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  monitor?: string;
}

export interface ClubPc {
  id: string;
  pc_id: string;
  label: string;
  name: string;
  zone: 'Standard' | 'VIP' | string;
  status: PcStatus;
  online: boolean;
  current_user: string | null;
  remaining_seconds: number;
  current_game: string | null;
  alert: string | null;
  specs?: PcHardwareSpecs;
  cpu_usage?: number;
  memory_usage?: number;
  gpu_usage?: number;
  processes?: string[];
  last_heartbeat?: number;
}

export interface Tariff {
  id: string;
  name: string;
  zone_name: string;
  duration_minutes: number;
  price_kzt: number;
  is_package: boolean;
}

export interface AdminConfig {
  serverIp: string;
  serverPort: number;
  serverUrl: string;
  clubName: string;
  cashierName: string;
  authToken: string;
  pollIntervalMs: number;
}

export interface AdminAlert {
  id: string;
  pc_id: string;
  pc_label: string;
  message: string;
  timestamp: number;
  type: 'help' | 'order' | 'warning';
}

export interface AdminElectronAPI {
  getConfig: () => Promise<AdminConfig>;
  saveConfig: (config: Partial<AdminConfig>) => Promise<{ success: boolean; error?: string }>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  openExternal: (url: string) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    adminAPI?: AdminElectronAPI;
  }
}
