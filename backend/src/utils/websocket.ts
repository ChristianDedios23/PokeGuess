import { WebSocket } from "ws";
import type { GameRoom, TurnPlayer } from "../db/types";
import { connections } from "../services/connectionRegistry";
import { sanitizeRoomForViewer, type PublicGameRoom } from "./roomView";

export function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

type RoomPayload = { room: GameRoom; [key: string]: unknown };

/** Send a room-bearing payload to one socket, sanitized for that viewer. */
export function sendRoomToConnection(
  ws: WebSocket,
  room: GameRoom,
  viewer: TurnPlayer,
  payload: Omit<RoomPayload, "room"> & Record<string, unknown>,
): void {
  sendJson(ws, { ...payload, room: sanitizeRoomForViewer(room, viewer) });
}

/**
 * Broadcast a payload that includes `room` to each connected player,
 * with secrets stripped appropriately for that viewer.
 */
export function broadcastToRoom(
  room: GameRoom,
  payload: RoomPayload,
  excludeConnectionId?: string,
): void {
  for (const slot of ["player1", "player2"] as const) {
    const player = room.players[slot];
    if (!player?.connectionId || player.connectionId === excludeConnectionId) continue;
    const entry = connections.get(player.connectionId);
    if (!entry) continue;

    const publicRoom: PublicGameRoom = sanitizeRoomForViewer(room, slot);
    sendJson(entry.ws, { ...payload, room: publicRoom });
  }
}
