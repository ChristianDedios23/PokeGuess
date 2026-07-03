import type { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { GameError, handleDisconnect, registerConnection } from "./controllers/game";

export const WS_PATH = "/ws";

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function setupWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: WS_PATH });

  wss.on("connection", (ws) => {
    let connectionId: string | undefined;

    ws.on("message", async (raw) => {
      let msg: { action: string; [key: string]: unknown };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        sendJson(ws, { action: "error", status: 400, message: "Invalid message format" });
        return;
      }

      try {
        if (msg.action === "register") {
          const roomCode = msg.roomCode as string | undefined;
          const displayName = msg.displayName as string | undefined;
          if (!roomCode || !displayName) {
            throw new GameError(400, "roomCode and displayName are required");
          }
          const result = await registerConnection(ws, roomCode, displayName);
          connectionId = result.connectionId;
          return;
        }

        sendJson(ws, { action: "error", status: 400, message: `Unknown action: ${msg.action}` });
      } catch (error) {
        const status = error instanceof GameError ? error.status : 500;
        const message = error instanceof GameError ? error.message : "Internal server error";
        sendJson(ws, { action: "error", status, message });
      }
    });

    ws.on("close", () => {
      if (connectionId) void handleDisconnect(connectionId);
    });
  });
}
