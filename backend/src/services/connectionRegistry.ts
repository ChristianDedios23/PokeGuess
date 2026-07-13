import { randomBytes } from "crypto";
import { WebSocket } from "ws";
import { getRoom, saveRoom } from "../db/rooms";
import type { TurnPlayer } from "../db/types";
import { GameError } from "../types/errors";
import { broadcastToRoom } from "../utils/websocket";

export const connections = new Map<string, { ws: WebSocket; roomCode: string }>();

export function generateConnectionId(): string {
  return randomBytes(16).toString("hex");
}

export function getConnectionEntry(connectionId: string) {
  const entry = connections.get(connectionId);
  if (!entry) throw new GameError(403, "Not connected");
  return entry;
}

export async function attachPlayer(
  ws: WebSocket,
  roomCode: string,
  slot: TurnPlayer,
): Promise<string> {
  const room = await getRoom(roomCode);
  if (!room) throw new GameError(404, "Room not found");

  const player = room.players[slot];
  if (!player) throw new GameError(403, "Player not in room");

  const connectionId = generateConnectionId();

  if (player.connectionId) {
    connections.delete(player.connectionId);
  }

  player.connectionId = connectionId;
  player.connected = true;
  player.disconnectedAt = undefined;
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);
  connections.set(connectionId, { ws, roomCode });

  return connectionId;
}

export async function handleDisconnect(connectionId: string): Promise<void> {
  const entry = connections.get(connectionId);
  connections.delete(connectionId);
  if (!entry) return;

  const room = await getRoom(entry.roomCode);
  if (!room) return;

  const slot =
    room.players.player1?.connectionId === connectionId
      ? "player1"
      : room.players.player2?.connectionId === connectionId
        ? "player2"
        : null;
  if (!slot) return;

  const fresh = await getRoom(entry.roomCode);
  if (!fresh) return;

  const player = fresh.players[slot];
  if (!player) return;

  player.connected = false;
  player.ready = false;
  player.disconnectedAt = new Date().toISOString();
  fresh.updatedAt = new Date().toISOString();
  await saveRoom(fresh);
  broadcastToRoom(fresh, { action: "roomUpdated", room: fresh });
}
