import { Redis } from "ioredis";
import type { WebSocket } from "ws";
import { config } from "./config.js";
import { boardChannel } from "./redis.js";
import { getBoard } from "./boards.js";

interface Client {
  socket: WebSocket;
  boardId: string;
  alive: boolean;
}

export class RealtimeHub {
  private clients = new Set<Client>();
  private byBoard = new Map<string, Set<Client>>();
  private sub: Redis | null = null;

  async start(): Promise<void> {
    this.sub = new Redis(config.redisUrl, { lazyConnect: true });
    this.sub.on("message", (channel, message) => {
      const boardId = channel.replace(/:events$/, "");
      this.broadcast(boardId, message);
    });
    await this.sub.connect();
  }

  async join(socket: WebSocket, boardId: string): Promise<void> {
    const client: Client = { socket, boardId, alive: true };
    this.clients.add(client);

    socket.on("pong", () => {
      client.alive = true;
    });
    socket.on("close", () => this.leave(client));
    socket.on("error", () => this.leave(client));

    let set = this.byBoard.get(boardId);
    if (!set) {
      set = new Set();
      this.byBoard.set(boardId, set);
      await this.sub?.subscribe(boardChannel(boardId));
    }
    set.add(client);

    this.broadcastPresence(boardId, set.size);
    const board = await getBoard(boardId);
    if (board) this.send(socket, JSON.stringify({ type: "board", board }));
  }

  private leave(client: Client): void {
    this.clients.delete(client);
    const set = this.byBoard.get(client.boardId);
    if (!set) return;
    set.delete(client);
    this.broadcastPresence(client.boardId, set.size);
    if (set.size === 0) {
      this.byBoard.delete(client.boardId);
      void this.sub?.unsubscribe(boardChannel(client.boardId));
    }
  }

  private broadcast(boardId: string, message: string): void {
    const set = this.byBoard.get(boardId);
    if (!set) return;
    for (const c of set) this.send(c.socket, message);
  }

  private broadcastPresence(boardId: string, count: number): void {
    this.broadcast(boardId, JSON.stringify({ type: "presence", count }));
  }

  private send(socket: WebSocket, message: string): void {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }

  pingAll(): void {
    for (const c of this.clients) {
      if (!c.alive) {
        this.leave(c);
        continue;
      }
      c.alive = false;
      try {
        c.socket.ping();
      } catch {
        this.leave(c);
      }
    }
  }

  clientCount(boardId: string): number {
    return this.byBoard.get(boardId)?.size ?? 0;
  }
}

export const hub = new RealtimeHub();
