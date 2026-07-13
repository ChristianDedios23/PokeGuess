import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { WebSocket } from "ws";
import { env } from "../config/env";
import { getAllPokemon } from "../data/pokemon";
import { getRoom, saveRoom } from "../db/rooms";
import type { GameRoom, RoomPlayer, TurnPlayer } from "../db/types";
import { GameError } from "../types/errors";
import { broadcastToRoom, sendJson } from "../utils/websocket";
import { attachPlayer, getConnectionEntry } from "./connectionRegistry";

const MAX_DISPLAY_NAME_LENGTH = 24;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const ROOM_TTL_SECONDS = 3600;
const BOARD_SIZE = 30;

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

function pickBoard(size: number): number[] {
  const pool = getAllPokemon().map((pokemon) => pokemon.id);
  const board: number[] = [];

  for (let i = 0; i < size && pool.length > 0; i++) {
    const index = randomInt(0, pool.length);
    board.push(pool[index]);
    pool.splice(index, 1);
  }

  return board;
}

function pickFromBoard(board: number[]): number {
  return board[randomInt(0, board.length)];
}

function generatePlayerToken(): string {
  return randomBytes(24).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Verifies a raw token against the stored hash without leaking timing info. */
function tokensMatch(providedToken: string | undefined, expectedHash: string): boolean {
  if (!providedToken) return false;
  const a = Buffer.from(hashToken(providedToken), "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function createPlayer(
  displayName: string,
  secretPokemonId: number,
  playerTokenHash: string,
): RoomPlayer {
  return {
    connectionId: "",
    displayName,
    secretPokemonId,
    connected: false,
    ready: false,
    playerTokenHash,
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

/**
 * Auto-forfeits a player who has been disconnected past the grace period.
 * Runs on every room read instead of relying on a scheduled in-process
 * timer, since nothing in-memory is durable across restarts or shared
 * across instances in a horizontally-scaled deployment.
 */
async function resolveExpiredDisconnects(room: GameRoom): Promise<GameRoom> {
  if (room.status !== "ACTIVE") return room;

  for (const slot of ["player1", "player2"] as const) {
    const player = room.players[slot];
    if (!player || player.connected || !player.disconnectedAt) continue;

    const elapsedMs = Date.now() - new Date(player.disconnectedAt).getTime();
    if (elapsedMs < env.forfeitGraceMs) continue;

    const opponentSlot: TurnPlayer = slot === "player1" ? "player2" : "player1";
    room.status = "FORFEITED";
    room.winner = opponentSlot;
    room.updatedAt = new Date().toISOString();
    await saveRoom(room);

    broadcastToRoom(room, {
      action: "gameOver",
      room,
      forfeitedBy: slot,
      reason: "disconnect_timeout",
    });
    break;
  }

  return room;
}

export async function requireRoom(roomCode: string): Promise<GameRoom> {
  const room = await getRoom(roomCode);
  if (!room) throw new GameError(404, "Room not found");
  return resolveExpiredDisconnects(room);
}

export async function createRoom(
  displayName: string,
): Promise<{ room: GameRoom; playerToken: string }> {
  const normalizedName = normalizeDisplayName(displayName);
  const roomCode = await generateUniqueRoomCode();
  const now = new Date().toISOString();
  const board = pickBoard(BOARD_SIZE);
  const playerToken = generatePlayerToken();

  const room: GameRoom = {
    roomCode,
    status: "WAITING",
    board,
    players: {
      player1: createPlayer(normalizedName, pickFromBoard(board), hashToken(playerToken)),
    },
    createdAt: now,
    updatedAt: now,
    expiresAt: Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS,
  };

  await saveRoom(room);

  return { room, playerToken };
}

export async function joinRoom(
  roomCode: string,
  displayName: string,
): Promise<{ room: GameRoom; playerToken: string }> {
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

  const playerToken = generatePlayerToken();
  room.players.player2 = createPlayer(
    normalizedName,
    pickFromBoard(room.board),
    hashToken(playerToken),
  );
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);

  return { room, playerToken };
}

export async function registerConnection(
  ws: WebSocket,
  roomCode: string,
  displayName: string,
  playerToken: string | undefined,
): Promise<{ connectionId: string; room: GameRoom; isHost: boolean }> {
  const normalizedName = normalizeDisplayName(displayName);
  const room = await getRoom(roomCode);
  if (!room) throw new GameError(404, "Room not found");

  const slot = findPlayerSlotByDisplayName(room, normalizedName);
  if (!slot) throw new GameError(403, "Player not in room");

  const player = room.players[slot]!;
  if (!tokensMatch(playerToken, player.playerTokenHash)) {
    throw new GameError(403, "Invalid or missing session token");
  }

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

/**
 * Records a player's one-shot final guess. The match only ends once BOTH
 * players have guessed — a single guess just gets recorded and broadcast
 * as a room update so the opponent still gets their turn.
 */
export async function makeGuess(connectionId: string, guessedPokemonId: number): Promise<GameRoom> {
  const { roomCode } = getConnectionEntry(connectionId);

  const existing = await requireRoom(roomCode);
  if (existing.status !== "ACTIVE") throw new GameError(409, "Game is not active");
  if (!existing.board.includes(guessedPokemonId)) {
    throw new GameError(400, "Pokémon is not on the board");
  }

  const slot = findPlayerSlotByConnectionId(existing, connectionId);
  if (!slot) throw new GameError(403, "Player not in room");
  if (existing.players[slot]!.guess) throw new GameError(409, "You already made your guess");

  const opponentSlot: TurnPlayer = slot === "player1" ? "player2" : "player1";
  if (!existing.players[opponentSlot]) throw new GameError(409, "Opponent not in room");

  const room = await requireRoom(roomCode);
  if (room.status !== "ACTIVE") throw new GameError(409, "Game is not active");
  if (room.players[slot]!.guess) throw new GameError(409, "You already made your guess");

  const opponent = room.players[opponentSlot];
  if (!opponent) throw new GameError(409, "Opponent not in room");

  const correct = guessedPokemonId === opponent.secretPokemonId;
  room.players[slot]!.guess = { pokemonId: guessedPokemonId, correct };
  room.updatedAt = new Date().toISOString();

  const bothGuessed = Boolean(room.players.player1?.guess && room.players.player2?.guess);
  if (!bothGuessed) {
    await saveRoom(room);
    broadcastToRoom(room, { action: "roomUpdated", room });
    return room;
  }

  const p1Correct = room.players.player1!.guess!.correct;
  const p2Correct = room.players.player2!.guess!.correct;
  room.status = "FINISHED";
  room.winner =
    p1Correct && !p2Correct ? "player1" : p2Correct && !p1Correct ? "player2" : undefined;
  await saveRoom(room);

  broadcastToRoom(room, { action: "gameOver", room });
  return room;
}

export async function forfeitGame(connectionId: string): Promise<GameRoom> {
  const { roomCode } = getConnectionEntry(connectionId);
  const existing = await requireRoom(roomCode);
  if (existing.status !== "ACTIVE") throw new GameError(409, "Game is not active");

  const slot = findPlayerSlotByConnectionId(existing, connectionId);
  if (!slot) throw new GameError(403, "Player not in room");

  const room = await requireRoom(roomCode);
  if (room.status !== "ACTIVE") throw new GameError(409, "Game is not active");

  const opponentSlot: TurnPlayer = slot === "player1" ? "player2" : "player1";

  room.status = "FORFEITED";
  room.winner = opponentSlot;
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);

  broadcastToRoom(room, {
    action: "gameOver",
    room,
    forfeitedBy: slot,
    reason: "forfeit",
  });

  return room;
}

/** Lightweight liveness ping — its only job is to trigger `resolveExpiredDisconnects`. */
export async function touchRoomForConnection(connectionId: string): Promise<void> {
  const { roomCode } = getConnectionEntry(connectionId);
  await requireRoom(roomCode);
}
