import type { BoardEvent } from "./types";

export type Handler = (evt: BoardEvent) => void;

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private url: string;
  private handlers = new Set<Handler>();
  private retries = 0;
  private closedByUser = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  status: "connecting" | "open" | "closed" = "connecting";
  statusListeners = new Set<(s: RealtimeClient["status"]) => void>();

  constructor(boardId: string) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    this.url = `${proto}://${location.host}/ws/${boardId}`;
  }

  connect(): void {
    this.closedByUser = false;
    this.open();
  }

  private open(): void {
    this.setStatus("connecting");
    const ws = new WebSocket(this.url);
    this.socket = ws;

    ws.onopen = () => {
      this.retries = 0;
      this.setStatus("open");
    };
    ws.onmessage = (e) => {
      try {
        const evt = JSON.parse(String(e.data)) as BoardEvent;
        for (const h of this.handlers) h(evt);
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => {
      this.setStatus("closed");
      if (this.closedByUser) return;
      const delay = Math.min(1000 * 2 ** this.retries, 15000);
      this.retries += 1;
      this.timer = setTimeout(() => this.open(), delay);
    };
    ws.onerror = () => {
      ws.close();
    };
  }

  on(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatus(l: (s: RealtimeClient["status"]) => void): () => void {
    this.statusListeners.add(l);
    l(this.status);
    return () => this.statusListeners.delete(l);
  }

  private setStatus(s: RealtimeClient["status"]): void {
    this.status = s;
    for (const l of this.statusListeners) l(s);
  }

  close(): void {
    this.closedByUser = true;
    if (this.timer) clearTimeout(this.timer);
    this.socket?.close();
    this.socket = null;
  }
}
