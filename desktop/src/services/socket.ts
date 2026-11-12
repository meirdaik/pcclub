import { ServerMessage, ClientMessage } from '../types';
import { getAppConfig } from './config';

type MessageHandler = (message: ServerMessage) => void;

const HEARTBEAT_INTERVAL = 5_000; // 5 seconds telemetry heartbeat
const BASE_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 15_000;

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

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        console.log('[SENET Socket] Message received:', message);
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

  private sendHeartbeat(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const config = getAppConfig();
      const hb: ClientMessage = {
        type: 'heartbeat',
        pc_id: config.pcId,
        status: this.currentStatus,
        remaining_seconds: this.remainingSeconds,
        active_game: this.activeGame || undefined,
        current_user: this.currentUser || undefined,
        timestamp: Date.now(),
      };
      this.ws.send(JSON.stringify(hb));
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
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_DELAY,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      this.doConnect();
    }, delay);
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
}

export const socketService = new SocketService();
