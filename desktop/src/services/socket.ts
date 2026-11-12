import { ServerMessage, ClientMessage } from '../types';
import { getAppConfig } from './config';

type MessageHandler = (message: ServerMessage) => void;

const HEARTBEAT_INTERVAL = 5_000; // 5 seconds telemetry heartbeat
const RECONNECT_DELAY = 2_000; // Fast 2-second aggressive auto-reconnect for production stability

class SocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private shouldReconnect = true;

  // Live telemetry state
  private currentStatus: 'LOCKED' | 'ACTIVE' = 'LOCKED';
  private remainingSeconds = 0;
  private activeGame: string | null = null;
  private currentUser: string | null = null;

  connect(): void {
    this.shouldReconnect = true;
    this.reconnectAttempt = 0;
    this.doConnect();
  }

  updateSessionTelemetry(
    status: 'LOCKED' | 'ACTIVE',
    remainingSeconds: number,
    activeGame?: string | null,
    currentUser?: string | null,
  ): void {
    this.currentStatus = status;
    this.remainingSeconds = remainingSeconds;
    if (activeGame !== undefined) this.activeGame = activeGame;
    if (currentUser !== undefined) this.currentUser = currentUser;

    // Immediately trigger a heartbeat ping when state changes
    this.sendHeartbeat();
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const config = getAppConfig();
    const url = `${config.wsUrl}/ws/pc/${config.pcId}`;
    console.log(`[SENET Socket] Connecting to ${url}...`);

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.warn('[SENET Socket] Connection error:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log(`[SENET Socket] Connected to club server for ${config.pcId}`);
      this.reconnectAttempt = 0;

      // Send authentication handshake
      const authMsg: ClientMessage = { type: 'auth', token: config.authToken };
      this.ws?.send(JSON.stringify(authMsg));

      // Start 5-second heartbeat telemetry
      this.startHeartbeat();
    };

    this.ws.onmessage = async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        console.log('[SENET Socket] Message received:', message);

        // Handle direct remote action commands from admin
        if (message.action === 'SET_POWER_PLAN' && message.plan) {
          window.electronAPI?.setPowerPlan?.(message.plan as string);
        } else if (message.action === 'KILL_PROCESS') {
          window.electronAPI?.killProcess?.({
            pid: message.pid as number | undefined,
            name: message.name as string | undefined,
          });
        } else if (message.action === 'LAUNCH_APP' && message.path) {
          window.electronAPI?.launchApp?.(message.path as string);
        } else if (message.action === 'SET_MAINTENANCE') {
          window.electronAPI?.setMaintenanceMode?.(Boolean(message.enabled));
        } else if (message.action === 'REBOOT') {
          window.electronAPI?.systemReboot?.();
        } else if (message.action === 'SHUTDOWN') {
          window.electronAPI?.systemShutdown?.();
        }

        this.handlers.forEach((handler) => handler(message));
      } catch (err) {
        console.error('[SENET Socket] Failed to parse server message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[SENET Socket] Disconnected');
      this.stopHeartbeat();
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error('[SENET Socket] Socket error:', err);
      this.ws?.close();
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL);
  }

  private async sendHeartbeat(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const config = getAppConfig();
      let realTelem: Record<string, unknown> = {};
      if (window.electronAPI?.getRealTelemetry) {
        try {
          realTelem = await window.electronAPI.getRealTelemetry();
        } catch {
          // ignore
        }
      }

      const hb: ClientMessage = {
        type: 'heartbeat',
        pc_id: config.pcId,
        status: this.currentStatus,
        remaining_seconds: this.remainingSeconds,
        active_game: this.activeGame || undefined,
        current_user: this.currentUser || undefined,
        timestamp: Date.now(),
        ...realTelem,
      };
      this.ws.send(JSON.stringify(hb));
    }
  }

  sendChatMessage(text: string, sender: string = 'Player'): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const config = getAppConfig();
      this.ws.send(
        JSON.stringify({
          type: 'chat_message',
          pc_id: config.pcId,
          text,
          sender,
          timestamp: Date.now(),
        }),
      );
    }
  }

  sendCallAdmin(message: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const config = getAppConfig();
      this.ws.send(
        JSON.stringify({
          type: 'call_admin',
          pc_id: config.pcId,
          message,
          timestamp: Date.now(),
        }),
      );
    }
  }

  sendOrderSnack(description: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const config = getAppConfig();
      this.ws.send(
        JSON.stringify({
          type: 'order_snack',
          pc_id: config.pcId,
          description,
          timestamp: Date.now(),
        }),
      );
    }
  }

  sendClearAlert(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const config = getAppConfig();
      this.ws.send(
        JSON.stringify({
          type: 'clear_alert',
          pc_id: config.pcId,
          timestamp: Date.now(),
        }),
      );
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      this.doConnect();
    }, RECONNECT_DELAY);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  reconnectWithConfig(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
    this.shouldReconnect = true;
    this.doConnect();
  }
}

export const socketService = new SocketService();
