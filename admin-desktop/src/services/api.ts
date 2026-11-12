import { ClubPc, Tariff } from '../types';
import { getAdminConfig } from './config';

class AdminApiClient {
  private get baseUrl(): string {
    return getAdminConfig().serverUrl;
  }

  async testConnection(testUrl?: string): Promise<boolean> {
    const url = (testUrl || this.baseUrl).replace(/\/+$/, '');
    // Try system info first (lightweight, zero DB load)
    try {
      const resp = await fetch(`${url}/api/system/info`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) return true;
    } catch {}

    // Fallback to health endpoint
    try {
      const resp = await fetch(`${url}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) return true;
    } catch {}

    // Fallback to admin pcs endpoint
    try {
      const resp = await fetch(`${url}/api/admin/pcs`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async fetchPcs(): Promise<ClubPc[]> {
    const res = await fetch(`${this.baseUrl}/api/admin/pcs`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch PCs`);
    return res.json();
  }

  async fetchTariffs(): Promise<Tariff[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/admin/tariffs`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch tariffs`);
      const data = await res.json();
      return (data || []).map((t: any) => ({
        ...t,
        id: String(t.id || Math.random()),
        name: t.name || 'Tariff',
        zone: t.zone || t.zone_name || 'Standard',
        zone_name: t.zone_name || t.zone || 'Standard',
        duration_minutes: Number(t.duration_minutes) || 60,
        price_kzt: Number(t.price_kzt) || 1000,
        is_package: Boolean(t.is_package),
      }));
    } catch (e) {
      console.warn('[Admin API] fetchTariffs error, returning empty list:', e);
      return [];
    }
  }

  async unlockPc(pcId: string, username: string, remainingSeconds: number, isVip = false): Promise<boolean> {
    const urls = [
      `${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/unlock`,
      `${this.baseUrl}/v1/pc/${encodeURIComponent(pcId)}/unlock`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            remaining_seconds: remainingSeconds,
            is_vip: isVip,
          }),
        });
        if (res.ok) return true;
      } catch {
        // try fallback
      }
    }
    return false;
  }

  async lockPc(pcId: string): Promise<boolean> {
    const urls = [
      `${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/lock`,
      `${this.baseUrl}/v1/pc/${encodeURIComponent(pcId)}/lock`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) return true;
      } catch {
        // try fallback
      }
    }
    return false;
  }

  async transferPcSession(fromPcId: string, toPcId: string): Promise<{ ok: boolean; detail?: string }> {
    const urls = [
      `${this.baseUrl}/api/pc/${encodeURIComponent(fromPcId)}/transfer/${encodeURIComponent(toPcId)}`,
      `${this.baseUrl}/api/admin/pcs/${encodeURIComponent(fromPcId)}/transfer/${encodeURIComponent(toPcId)}`,
      `${this.baseUrl}/v1/pc/${encodeURIComponent(fromPcId)}/transfer/${encodeURIComponent(toPcId)}`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (res.ok) return { ok: true, detail: data.detail };
        return { ok: false, detail: data.detail || 'Transfer failed' };
      } catch {
        // try fallback
      }
    }
    return { ok: false, detail: 'Network error transferring player session' };
  }

  async extendPc(pcId: string, additionalSeconds: number): Promise<boolean> {
    const urls = [
      `${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/extend`,
      `${this.baseUrl}/v1/pc/${encodeURIComponent(pcId)}/extend`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ additional_seconds: additionalSeconds }),
        });
        if (res.ok) return true;
      } catch {
        // try fallback
      }
    }
    return false;
  }

  async rebootPc(pcId: string): Promise<boolean> {
    const urls = [
      `${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/reboot`,
      `${this.baseUrl}/v1/pc/${encodeURIComponent(pcId)}/reboot`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'POST' });
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }
    return false;
  }

  async shutdownPc(pcId: string): Promise<boolean> {
    const urls = [
      `${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/shutdown`,
      `${this.baseUrl}/v1/pc/${encodeURIComponent(pcId)}/shutdown`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'POST' });
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }
    return false;
  }

  async clearAlert(pcId: string): Promise<boolean> {
    const urls = [
      `${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/clear-alert`,
      `${this.baseUrl}/v1/pc/${encodeURIComponent(pcId)}/clear-alert`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'POST' });
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }
    return false;
  }

  async setPowerPlan(pcId: string, plan: 'high_performance' | 'balanced' | 'power_saver'): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/power-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async killProcess(pcId: string, payload: { pid?: number; name?: string }): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/kill-process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async launchApp(pcId: string, path: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/launch-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async setMaintenanceMode(pcId: string, enabled: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async wakeOnLan(pcId: string, macAddress: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/wake-on-lan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac_address: macAddress }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async broadcastToPc(pcId: string, message: string, title = 'Admin Notification'): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, title }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async broadcastToAll(message: string, title = 'Club Broadcast'): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/pc/broadcast-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, title }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchChat(pcId?: string): Promise<any[]> {
    try {
      const url = pcId ? `${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/chat` : `${this.baseUrl}/api/admin/chat`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async sendChat(pcId: string, message: string, sender = 'Admin'): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/pc/${encodeURIComponent(pcId)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sender }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchOrders(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/admin/orders`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchShiftCurrent(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/admin/shift/current`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async closeShift(cashierName?: string, notes?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/admin/shift/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashier_name: cashierName, notes }),
    });
    if (!res.ok) throw new Error('Failed to close shift');
    return res.json();
  }
}

export const api = new AdminApiClient();
