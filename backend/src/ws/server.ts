import type { Server } from "http";
import { WebSocketServer } from "ws";
import { handleDisconnect, handleMessage } from "../handlers";
import type { HandlerContext } from "../handlers/types";

export const WS_PATH = "/ws";

export function setupWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: WS_PATH });

  wss.on("connection", (ws) => {
    const ctx: HandlerContext = {
      ws,
      connectionId: undefined,
      setConnectionId(id: string) {
        ctx.connectionId = id;
      },
    };

    ws.on("message", (raw) => {
      void handleMessage(ctx, raw);
    });

    ws.on("close", () => {
      void handleDisconnect(ctx.connectionId);
    });
  });
}
