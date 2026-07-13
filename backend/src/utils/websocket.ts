import { WebSocket } from "ws";
import type { GameRoom } from "../db/types";
import { connections } from "../services/connectionRegistry";

export function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function broadcastToRoom(
  room: GameRoom,
  payload: unknown,
  excludeConnectionId?: string,
): void {
  for (const player of [room.players.player1, room.players.player2]) {
    if (!player?.connectionId || player.connectionId === excludeConnectionId) continue;
    const entry = connections.get(player.connectionId);
    if (entry) sendJson(entry.ws, payload);
  }
}
