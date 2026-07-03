import { randomBytes, randomInt } from "crypto";
import { Request, Response } from "express";
import { WebSocket } from "ws";
import { getRoom, saveRoom } from "../db/rooms";
import type { GameRoom, RoomPlayer, TurnPlayer } from "../db/types";

const MAX_MESSAGE_LENGTH = 500;
const MAX_DISPLAY_NAME_LENGTH = 24;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const ROOM_TTL_SECONDS = 3600;

export const connections = new Map<string, { ws: WebSocket; roomCode: string }>();

export class GameError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GameError";
  }
}

const notImplemented = (action: string) => (_req: Request, res: Response) => {
  res.status(501).json({ error: `${action} is not implemented yet` });
};

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function normalizeDisplayName(name: string): string {
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

function generateConnectionId(): string {
  return randomBytes(16).toString("hex");
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

async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const roomCode = generateRoomCode();
    const existing = await getRoom(roomCode);
    if (!existing) return roomCode;
  }
  throw new GameError(500, "Failed to generate unique room code");
}

function getConnectionEntry(connectionId: string) {
  const entry = connections.get(connectionId);
  if (!entry) throw new GameError(403, "Not connected");
  return entry;
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

  const player = room.players[slot]!;
  const connectionId = generateConnectionId();

  if (player.connectionId) {
    connections.delete(player.connectionId);
  }

  player.connectionId = connectionId;
  player.connected = true;
  room.updatedAt = new Date().toISOString();

  await saveRoom(room);
  connections.set(connectionId, { ws, roomCode });

  sendJson(ws, {
    action: "registered",
    connectionId,
    roomCode,
    displayName: normalizedName,
    isHost: slot === "player1",
    room,
  });

  return { connectionId, room, isHost: slot === "player1" };
}

export async function handleDisconnect(connectionId: string): Promise<void> {
  const entry = connections.get(connectionId);
  connections.delete(connectionId);
  if (!entry) return;

  const room = await getRoom(entry.roomCode);
  if (!room) return;

  const slot = findPlayerSlotByConnectionId(room, connectionId);
  if (!slot) return;

  const player = room.players[slot];
  if (!player) return;

  player.connected = false;
  player.ready = false;
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);
  broadcastToRoom(room, { action: "roomUpdated", room });
}

export async function relayChatMessage(
  connectionId: string,
  text: string,
): Promise<{ sentAt: string }> {
  const message = text.trim();
  if (!message) throw new GameError(400, "Message cannot be empty");
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new GameError(400, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
  }

  getConnectionEntry(connectionId);
  const room = await getRoom(connections.get(connectionId)!.roomCode);
  if (!room) throw new GameError(404, "Room not found");
  if (room.status !== "ACTIVE") {
    throw new GameError(409, "Chat is only available after the game has started");
  }

  const senderSlot = findPlayerSlotByConnectionId(room, connectionId);
  if (!senderSlot) throw new GameError(403, "Player not in room");

  const sender = room.players[senderSlot]!;
  const opponentSlot: TurnPlayer = senderSlot === "player1" ? "player2" : "player1";
  const opponent = room.players[opponentSlot];
  if (!opponent) throw new GameError(409, "Opponent not in room yet");

  const opponentConn = connections.get(opponent.connectionId);
  if (!opponentConn || opponentConn.ws.readyState !== WebSocket.OPEN) {
    throw new GameError(409, "Opponent is not connected");
  }

  const sentAt = new Date().toISOString();
  sendJson(opponentConn.ws, {
    action: "chatMessage",
    roomCode: room.roomCode,
    fromConnectionId: sender.connectionId,
    fromDisplayName: sender.displayName,
    message,
    sentAt,
  });

  const senderConn = connections.get(sender.connectionId);
  if (senderConn) {
    sendJson(senderConn.ws, {
      action: "chatMessageSent",
      roomCode: room.roomCode,
      message,
      sentAt,
    });
  }

  return { sentAt };
}

async function readyUpPlayer(connectionId: string): Promise<GameRoom> {
  getConnectionEntry(connectionId);
  const entry = connections.get(connectionId)!;
  const room = await getRoom(entry.roomCode);
  if (!room) throw new GameError(404, "Room not found");
  if (room.status !== "WAITING") throw new GameError(409, "Game has already started");

  if (!room.players.player2) {
    throw new GameError(409, "Waiting for opponent to join");
  }

  const slot = findPlayerSlotByConnectionId(room, connectionId);
  if (!slot) throw new GameError(403, "Player not in room");

  const player = room.players[slot]!;
  player.ready = true;
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);
  broadcastToRoom(room, { action: "roomUpdated", room });
  return room;
}

async function startGameForRoom(connectionId: string): Promise<GameRoom> {
  getConnectionEntry(connectionId);
  const entry = connections.get(connectionId)!;
  const room = await getRoom(entry.roomCode);
  if (!room) throw new GameError(404, "Room not found");
  if (room.status !== "WAITING") throw new GameError(409, "Game has already started");

  const slot = findPlayerSlotByConnectionId(room, connectionId);
  if (slot !== "player1") throw new GameError(403, "Only the host can start the game");

  if (!room.players.player2) {
    throw new GameError(409, "Waiting for opponent to join");
  }

  const player1 = room.players.player1!;
  const player2 = room.players.player2;
  if (!player1.ready || !player2.ready) {
    throw new GameError(409, "Both players must be ready");
  }

  room.status = "ACTIVE";
  room.currentTurnPlayer = "player1";
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);
  broadcastToRoom(room, { action: "gameStarted", room });
  return room;
}

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { displayName } = req.body;
    if (!displayName) {
      return res.status(400).json({ error: "displayName is required" });
    }

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
    res.status(201).json({ roomCode, room });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const msg = error instanceof GameError ? error.message : "Failed to create room";
    res.status(status).json({ error: msg });
  }
};

export const joinRoom = async (req: Request, res: Response) => {
  try {
    const { roomCode, displayName } = req.body;
    if (!roomCode || !displayName) {
      return res.status(400).json({ error: "roomCode and displayName are required" });
    }

    const normalizedName = normalizeDisplayName(displayName);
    const room = await getRoom(roomCode);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status !== "WAITING") {
      return res.status(409).json({ error: "Room is not accepting players" });
    }
    if (room.players.player2) {
      return res.status(409).json({ error: "Room is full" });
    }
    if (room.players.player1?.displayName === normalizedName) {
      return res.status(409).json({ error: "Display name already taken in this room" });
    }

    room.players.player2 = createPlayer(normalizedName);
    room.updatedAt = new Date().toISOString();
    await saveRoom(room);
    broadcastToRoom(room, { action: "playerJoined", room });

    res.json({ room });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const msg = error instanceof GameError ? error.message : "Failed to join room";
    res.status(status).json({ error: msg });
  }
};

export const readyUp = async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.body;
    if (!connectionId) {
      return res.status(400).json({ error: "connectionId is required" });
    }

    const room = await readyUpPlayer(connectionId);
    res.json({ room });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const msg = error instanceof GameError ? error.message : "Failed to ready up";
    res.status(status).json({ error: msg });
  }
};

export const startGame = async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.body;
    if (!connectionId) {
      return res.status(400).json({ error: "connectionId is required" });
    }

    const room = await startGameForRoom(connectionId);
    res.json({ room });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const msg = error instanceof GameError ? error.message : "Failed to start game";
    res.status(status).json({ error: msg });
  }
};

export const sendChatMessage = async (req: Request, res: Response) => {
  try {
    const { connectionId, message } = req.body;
    if (!connectionId || message === undefined) {
      return res.status(400).json({ error: "connectionId and message are required" });
    }

    const result = await relayChatMessage(connectionId, message);
    res.json({ ok: true, sentAt: result.sentAt });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const msg = error instanceof GameError ? error.message : "Failed to send message";
    res.status(status).json({ error: msg });
  }
};

export const endTurn = notImplemented("endTurn");
export const makeGuess = notImplemented("makeGuess");
export const forfeitGame = notImplemented("forfeitGame");
export const leaveRoom = notImplemented("leaveRoom");
export const requestRematch = notImplemented("requestRematch");
