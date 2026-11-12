export type PcStatus = 'FREE' | 'BUSY' | 'ALERT' | 'OFFLINE';

export interface PcHardwareSpecs {
  cpu?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  monitor?: string;
}

export interface ProcessItem {
  name: string;
  pid?: number;
  memoryMb?: number;
}

export interface BiosSecurityInfo {
  secureBoot: 'ENABLED' | 'DISABLED' | 'UNSUPPORTED';
  tpmPresent: boolean;
  biosSerial: string;
  hwUuid: string;
  vanguardInstalled: boolean;
  faceitInstalled: boolean;
  antiCheatReady: boolean;
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
  processes?: Array<ProcessItem | string>;
  power_plan?: string;
  maintenance_mode?: boolean;
  mac_address?: string;
  security?: BiosSecurityInfo;
  last_heartbeat?: number;
}

export interface SnackOrder {
  id: string;
  pc_id: string;
  items: Array<{ name: string; quantity: number; price_kzt: number }>;
  amount_kzt: number;
  description: string;
  status: 'PENDING' | 'DELIVERED' | 'CANCELLED';
  created_at: string;
}

export interface CashierShift {
  id: string;
  cashier_name: string;
  opened_at: string;
  closed_at?: string | null;
  total_sessions: number;
  session_revenue_kzt: number;
  total_orders: number;
  order_revenue_kzt: number;
  total_revenue_kzt: number;
  is_active: boolean;
  notes?: string | null;
}

export interface ChatMessage {
  id: string;
  pc_id: string;
  sender: string;
  text: string;
  timestamp: number;
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
