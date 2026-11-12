import { ClubPc, Tariff } from '../types';
import { getAdminConfig } from './config';

class AdminApiClient {
  private get baseUrl(): string {
    return getAdminConfig().serverUrl;
  }

  async testConnection(testUrl?: string): Promise<boolean> {
    const url = testUrl || this.baseUrl;
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
    const res = await fetch(`${this.baseUrl}/api/admin/tariffs`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch tariffs`);
    return res.json();
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
}

export const api = new AdminApiClient();
