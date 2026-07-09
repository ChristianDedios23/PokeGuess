import type { WebSocket } from "ws";

export interface HandlerContext {
  ws: WebSocket;
  connectionId?: string;
  setConnectionId(id: string): void;
}

export type WsMessage = Record<string, unknown> & { action: string };
