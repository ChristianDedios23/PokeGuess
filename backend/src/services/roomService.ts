import { randomBytes, randomInt } from "crypto";
import { WebSocket } from "ws";
import { getRoom, saveRoom } from "../db/rooms";
import type { GameRoom, RoomPlayer, TurnPlayer } from "../db/types";
import { GameError } from "../types/errors";
import { broadcastToRoom, sendJson } from "../utils/websocket";
import { attachPlayer, getConnectionEntry } from "./connectionRegistry";

const MAX_DISPLAY_NAME_LENGTH = 24;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const ROOM_TTL_SECONDS = 3600;

export function normalizeDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new GameError(400, "Display name cannot be empty");
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new GameError(400, `Display name cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters`);
  }
  return trimmed;
}

function generateRoomCode(): string {
  const bytes = randomBytes(ROOM_CODE_LENGTH);
  return Array.from(bytes, (b) => ROOM_CODE_CHARS[b % ROOM_CODE_CHARS.length]).join("");
}

function randomPokemonId(): number {
  return randomInt(1, 152);
}

function createPlayer(displayName: string): RoomPlayer {
  return {
    connectionId: "",
    displayName,
    secretPokemonId: randomPokemonId(),
    connected: false,
    ready: false,
  };
}

function findPlayerSlotByConnectionId(room: GameRoom, connectionId: string): TurnPlayer | null {
  if (room.players.player1?.connectionId === connectionId) return "player1";
  if (room.players.player2?.connectionId === connectionId) return "player2";
  return null;
}

function findPlayerSlotByDisplayName(room: GameRoom, displayName: string): TurnPlayer | null {
  if (room.players.player1?.displayName === displayName) return "player1";
  if (room.players.player2?.displayName === displayName) return "player2";
  return null;
}

async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const roomCode = generateRoomCode();
    const existing = await getRoom(roomCode);
    if (!existing) return roomCode;
  }
  throw new GameError(500, "Failed to generate unique room code");
}

async function requireRoom(roomCode: string): Promise<GameRoom> {
  const room = await getRoom(roomCode);
  if (!room) throw new GameError(404, "Room not found");
  return room;
}

export async function createRoom(displayName: string): Promise<GameRoom> {
  const normalizedName = normalizeDisplayName(displayName);
  const roomCode = await generateUniqueRoomCode();
  const now = new Date().toISOString();

  const room: GameRoom = {
    roomCode,
    status: "WAITING",
    players: { player1: createPlayer(normalizedName) },
    createdAt: now,
    updatedAt: now,
    expiresAt: Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS,
  };

  await saveRoom(room);
  return room;
}

export async function joinRoom(roomCode: string, displayName: string): Promise<GameRoom> {
  const normalizedName = normalizeDisplayName(displayName);
  const existing = await requireRoom(roomCode);
  if (existing.status !== "WAITING") {
    throw new GameError(409, "Room is not accepting players");
  }
  if (existing.players.player2) {
    throw new GameError(409, "Room is full");
  }
  if (existing.players.player1?.displayName === normalizedName) {
    throw new GameError(409, "Display name already taken in this room");
  }

  const room = await requireRoom(roomCode);
  if (room.status !== "WAITING") {
    throw new GameError(409, "Room is not accepting players");
  }
  if (room.players.player2) {
    throw new GameError(409, "Room is full");
  }

  room.players.player2 = createPlayer(normalizedName);
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);
  return room;
}

export async function registerConnection(
  ws: WebSocket,
  roomCode: string,
  displayName: string,
): Promise<{ connectionId: string; room: GameRoom; isHost: boolean }> {
  const normalizedName = normalizeDisplayName(displayName);
  const room = await getRoom(roomCode);
  if (!room) throw new GameError(404, "Room not found");

  const slot = findPlayerSlotByDisplayName(room, normalizedName);
  if (!slot) throw new GameError(403, "Player not in room");

  const connectionId = await attachPlayer(ws, roomCode, slot);
  const updatedRoom = await requireRoom(roomCode);

  sendJson(ws, {
    action: "registered",
    connectionId,
    roomCode,
    displayName: normalizedName,
    isHost: slot === "player1",
    room: updatedRoom,
  });

  return { connectionId, room: updatedRoom, isHost: slot === "player1" };
}

export async function readyUpPlayer(connectionId: string): Promise<GameRoom> {
  const { roomCode } = getConnectionEntry(connectionId);

  for (let attempt = 0; attempt < 3; attempt++) {
    const room = await requireRoom(roomCode);
    if (room.status !== "WAITING") throw new GameError(409, "Game has already started");
    if (!room.players.player2) {
      throw new GameError(409, "Waiting for opponent to join");
    }

    const slot = findPlayerSlotByConnectionId(room, connectionId);
    if (!slot) throw new GameError(403, "Player not in room");
    if (room.players[slot]!.ready) {
      return room;
    }

    const otherSlot: TurnPlayer = slot === "player1" ? "player2" : "player1";
    const otherWasReady = room.players[otherSlot]?.ready ?? false;

    room.players[slot]!.ready = true;
    room.updatedAt = new Date().toISOString();
    await saveRoom(room);

    const saved = await requireRoom(roomCode);
    if (!saved.players[slot]!.ready) continue;
    if (otherWasReady && !saved.players[otherSlot]?.ready) continue;

    broadcastToRoom(saved, { action: "roomUpdated", room: saved });
    return saved;
  }

  throw new GameError(500, "Failed to ready up");
}

export async function startGameForRoom(connectionId: string): Promise<GameRoom> {
  const { roomCode } = getConnectionEntry(connectionId);
  const existing = await requireRoom(roomCode);
  if (existing.status !== "WAITING") throw new GameError(409, "Game has already started");

  const slot = findPlayerSlotByConnectionId(existing, connectionId);
  if (slot !== "player1") throw new GameError(403, "Only the host can start the game");

  if (!existing.players.player2) {
    throw new GameError(409, "Waiting for opponent to join");
  }

  const player1 = existing.players.player1!;
  const player2 = existing.players.player2;
  if (!player1.ready || !player2.ready) {
    throw new GameError(409, "Both players must be ready");
  }

  const room = await requireRoom(roomCode);
  if (room.status !== "WAITING") throw new GameError(409, "Game has already started");
  if (!room.players.player1?.ready || !room.players.player2?.ready) {
    throw new GameError(409, "Both players must be ready");
  }

  room.status = "ACTIVE";
  room.currentTurnPlayer = "player1";
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);
  broadcastToRoom(room, { action: "gameStarted", room });
  return room;
}
