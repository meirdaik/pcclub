import { ServerMessage, ClientMessage } from '../types';

type MessageHandler = (message: ServerMessage) => void;

const PC_ID = import.meta.env.VITE_PC_ID || 'pc-001';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const AUTH_TOKEN = import.meta.env.VITE_PC_AUTH_TOKEN || 'dev-pc-token';

const HEARTBEAT_INTERVAL = 30_000;
const BASE_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 30_000;

class SocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private shouldReconnect = true;

  connect(): void {
    this.shouldReconnect = true;
    this.reconnectAttempt = 0;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}/ws/pc/${PC_ID}`;
    console.log(`[Socket] Connecting to ${url}...`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[Socket] Connected');
      this.reconnectAttempt = 0;

      // Send auth message
      const authMsg: ClientMessage = { type: 'auth', token: AUTH_TOKEN };
      this.ws?.send(JSON.stringify(authMsg));

      // Start heartbeat
      this.startHeartbeat();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        console.log('[Socket] Received:', message);
        this.handlers.forEach((handler) => handler(message));
      } catch (err) {
        console.error('[Socket] Failed to parse message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[Socket] Disconnected');
      this.stopHeartbeat();
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error('[Socket] Error:', err);
      this.ws?.close();
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const hb: ClientMessage = { type: 'heartbeat' };
        this.ws.send(JSON.stringify(hb));
      }
    }, HEARTBEAT_INTERVAL);
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
    console.log(`[Socket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})...`);
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
