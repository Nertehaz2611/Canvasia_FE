import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getAccessToken } from "../utils/tokenStorage";

type MessageHandler = (body: unknown) => void;

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:8081/ws";

class WebSocketService {
  private client: Client | null = null;
  private readonly subscriptions: Map<string, StompSubscription> = new Map();
  private readonly pendingSubscriptions: Map<string, MessageHandler> = new Map();
  private connectPromise: Promise<void> | null = null;

  connect(): Promise<void> {
    if (this.connectPromise !== null) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const token = getAccessToken();

      this.client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),  // eslint-disable-line @typescript-eslint/no-unsafe-return
        connectHeaders: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        reconnectDelay: 5000,
        onConnect: () => {
          // Resubscribe pending subscriptions after (re)connect
          for (const [destination, handler] of this.pendingSubscriptions.entries()) {
            this.doSubscribe(destination, handler);
          }
          resolve();
        },
        onStompError: (frame) => {
          reject(new Error(frame.headers["message"] ?? "STOMP error"));
        },
      });

      this.client.activate();
    });

    return this.connectPromise;
  }

  private doSubscribe(destination: string, handler: MessageHandler) {
    if (!this.client?.connected) return;
    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      try {
        handler(JSON.parse(msg.body) as unknown);
      } catch {
        // ignore malformed frames
      }
    });
    this.subscriptions.set(destination, sub);
  }

  async subscribe(destination: string, handler: MessageHandler): Promise<void> {
    this.pendingSubscriptions.set(destination, handler);
    await this.connect();
    if (!this.subscriptions.has(destination)) {
      this.doSubscribe(destination, handler);
    }
  }

  unsubscribe(destination: string) {
    this.subscriptions.get(destination)?.unsubscribe();
    this.subscriptions.delete(destination);
    this.pendingSubscriptions.delete(destination);
  }

  send(destination: string, body: unknown) {
    this.client?.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  disconnect() {
    this.client?.deactivate();
    this.client = null;
    this.connectPromise = null;
    this.subscriptions.clear();
    this.pendingSubscriptions.clear();
  }

  get isConnected() {
    return this.client?.connected ?? false;
  }
}

// Singleton — one connection per app session
export const wsService = new WebSocketService();
