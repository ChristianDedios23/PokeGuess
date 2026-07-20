import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { WebSocket } from "ws";
import { env } from "../config/env";
import { getAllPokemon, getPokemonById, rollGender } from "../data/pokemon";
import { getRoom, saveRoom } from "../db/rooms";
import type {
  GameRoom,
  GenerationSelection,
  PokemonGender,
  RoomPlayer,
  TurnPlayer,
} from "../db/types";
import { GameError } from "../types/errors";
import { broadcastToRoom, sendRoomToConnection } from "../utils/websocket";
import { attachPlayer, getConnectionEntry } from "./connectionRegistry";
import {
  DEFAULT_MODIFIERS,
  idMatchesGenerationSelection,
  resolveStartingPlayer,
  validateModifiers,
} from "./modifiers";

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

function genderForPokemonId(pokemonId: number): PokemonGender {
  const pokemon = getPokemonById(pokemonId);
  return rollGender(pokemon?.genderRate ?? -1);
}

function pickBoard(
  size: number,
  generation: GenerationSelection = "all",
): { board: number[]; boardGenders: PokemonGender[] } {
  const allIds = getAllPokemon().map((pokemon) => pokemon.id);
  let pool = allIds.filter((id) => idMatchesGenerationSelection(id, generation));

  // Safety net: never let a too-narrow selection starve the board.
  if (pool.length < size) pool = allIds.slice();

  const board: number[] = [];
  const boardGenders: PokemonGender[] = [];

  for (let i = 0; i < size && pool.length > 0; i++) {
    const index = randomInt(0, pool.length);
    const pokemonId = pool[index];
    board.push(pokemonId);
    boardGenders.push(genderForPokemonId(pokemonId));
    pool.splice(index, 1);
  }

  return { board, boardGenders };
}

function pickSecretFromBoard(
  board: number[],
  boardGenders: PokemonGender[],
): { secretPokemonId: number; secretGender: PokemonGender } {
  const index = randomInt(0, board.length);
  return {
    secretPokemonId: board[index],
    secretGender: boardGenders[index] ?? "genderless",
  };
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
  secretGender: PokemonGender,
  playerTokenHash: string,
): RoomPlayer {
  return {
    connectionId: "",
    displayName,
    secretPokemonId,
    secretGender,
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
  // Leave-timer disabled: a disconnected player is never auto-forfeited.
  if (room.modifiers?.leaveTimer === "disable") return room;

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
  const { board, boardGenders } = pickBoard(BOARD_SIZE);
  const playerToken = generatePlayerToken();
  const secret = pickSecretFromBoard(board, boardGenders);

  const room: GameRoom = {
    roomCode,
    status: "WAITING",
    board,
    boardGenders,
    players: {
      player1: createPlayer(
        normalizedName,
        secret.secretPokemonId,
        secret.secretGender,
        hashToken(playerToken),
      ),
    },
    modifiers: { ...DEFAULT_MODIFIERS },
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
  const secret = pickSecretFromBoard(room.board, room.boardGenders ?? []);
  room.players.player2 = createPlayer(
    normalizedName,
    secret.secretPokemonId,
    secret.secretGender,
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

  sendRoomToConnection(ws, updatedRoom, slot, {
    action: "registered",
    connectionId,
    roomCode,
    displayName: normalizedName,
    isHost: slot === "player1",
  });

  // Let the opponent know this player reconnected — otherwise their
  // disconnect countdown banner keeps ticking against stale room state.
  broadcastToRoom(updatedRoom, { action: "roomUpdated", room: updatedRoom }, connectionId);

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

  // Regenerate the board now that modifiers (e.g. generation) are locked in —
  // the initial board at room creation predates any lobby changes.
  const { board, boardGenders } = pickBoard(BOARD_SIZE, room.modifiers.generation);
  const secret1 = pickSecretFromBoard(board, boardGenders);
  const secret2 = pickSecretFromBoard(board, boardGenders);

  room.status = "ACTIVE";
  room.board = board;
  room.boardGenders = boardGenders;
  room.players.player1.secretPokemonId = secret1.secretPokemonId;
  room.players.player1.secretGender = secret1.secretGender;
  room.players.player2.secretPokemonId = secret2.secretPokemonId;
  room.players.player2.secretGender = secret2.secretGender;
  room.currentTurnPlayer = resolveStartingPlayer(room.modifiers.firstPlayer);
  room.turnCount = 0;
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);
  broadcastToRoom(room, { action: "gameStarted", room });
  return room;
}

/**
 * Records a guess. How it resolves depends on the room's guessing rule:
 *  - classic:        correct → you win; wrong → you lose immediately.
 *  - final-showdown: first guess locks in, opponent still gets one guess;
 *                    the match ends once both have guessed (draw logic).
 *  - casual:         correct → you win; wrong → no elimination (in structured
 *                    play the turn passes; in freeplay it's a harmless miss).
 * In structured play a guess is only allowed on your own turn.
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

  const { playMode, guessingRule } = room.modifiers;
  if (playMode === "structured" && room.currentTurnPlayer !== slot) {
    throw new GameError(409, "It's not your turn");
  }

  const correct = guessedPokemonId === opponent.secretPokemonId;
  const now = new Date().toISOString();

  // --- Classic: a single guess decides the game outright. ---
  if (guessingRule === "classic") {
    room.players[slot]!.guess = { pokemonId: guessedPokemonId, correct };
    room.status = "FINISHED";
    room.winner = correct ? slot : opponentSlot;
    room.updatedAt = now;
    await saveRoom(room);
    broadcastToRoom(room, { action: "gameOver", room });
    return room;
  }

  // --- Casual: correct wins; a wrong guess never ends the game. ---
  if (guessingRule === "casual") {
    if (correct) {
      room.players[slot]!.guess = { pokemonId: guessedPokemonId, correct };
      room.status = "FINISHED";
      room.winner = slot;
      room.updatedAt = now;
      await saveRoom(room);
      broadcastToRoom(room, { action: "gameOver", room });
      return room;
    }

    // Wrong guess: no record kept (so they can guess again later). In
    // structured play the miss costs them their turn.
    room.updatedAt = now;
    if (playMode === "structured") {
      return await advanceTurn(room, slot);
    }
    await saveRoom(room);
    broadcastToRoom(room, { action: "roomUpdated", room });
    return room;
  }

  // --- Final Showdown: both players guess once, then resolve together. ---
  room.players[slot]!.guess = { pokemonId: guessedPokemonId, correct };
  room.updatedAt = now;

  const bothGuessed = Boolean(room.players.player1?.guess && room.players.player2?.guess);
  if (!bothGuessed) {
    if (playMode === "structured") {
      // Hand the turn to the opponent so they get their final guess.
      room.currentTurnPlayer = opponentSlot;
    }
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

/**
 * Passes the turn to the opponent in structured play, advancing the turn
 * counter. When a Limited Turns cap is reached the match ends in a draw.
 * Shared by the End Turn action and casual wrong-guess handling.
 */
async function advanceTurn(room: GameRoom, currentSlot: TurnPlayer): Promise<GameRoom> {
  const opponentSlot: TurnPlayer = currentSlot === "player1" ? "player2" : "player1";
  const nextTurnCount = (room.turnCount ?? 0) + 1;
  const { limitedTurns } = room.modifiers;

  // Cap is per player, so the total turn budget is limit * 2.
  if (typeof limitedTurns === "number" && nextTurnCount >= limitedTurns * 2) {
    room.turnCount = nextTurnCount;
    room.status = "FINISHED";
    room.winner = undefined; // ran out of turns — nobody wins
    room.updatedAt = new Date().toISOString();
    await saveRoom(room);
    broadcastToRoom(room, { action: "gameOver", room });
    return room;
  }

  room.turnCount = nextTurnCount;
  room.currentTurnPlayer = opponentSlot;
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);
  broadcastToRoom(room, { action: "roomUpdated", room });
  return room;
}

/** Structured play: the current player voluntarily ends their turn. */
export async function endTurn(connectionId: string): Promise<GameRoom> {
  const { roomCode } = getConnectionEntry(connectionId);

  const room = await requireRoom(roomCode);
  if (room.status !== "ACTIVE") throw new GameError(409, "Game is not active");
  if (room.modifiers.playMode !== "structured") {
    throw new GameError(409, "Turns aren't tracked in this mode");
  }

  const slot = findPlayerSlotByConnectionId(room, connectionId);
  if (!slot) throw new GameError(403, "Player not in room");
  if (room.currentTurnPlayer !== slot) throw new GameError(409, "It's not your turn");

  return await advanceTurn(room, slot);
}

/**
 * Host updates the match modifiers while the room is still in the lobby.
 * Broadcast so the guest's Modifiers panel stays in sync live.
 */
export async function updateRoomModifiers(
  connectionId: string,
  rawModifiers: unknown,
): Promise<GameRoom> {
  const { roomCode } = getConnectionEntry(connectionId);
  const modifiers = validateModifiers(rawModifiers);

  const room = await requireRoom(roomCode);
  if (room.status !== "WAITING") {
    throw new GameError(409, "Modifiers can only be changed before the game starts");
  }

  const slot = findPlayerSlotByConnectionId(room, connectionId);
  if (slot !== "player1") throw new GameError(403, "Only the host can change modifiers");

  room.modifiers = modifiers;
  room.updatedAt = new Date().toISOString();
  await saveRoom(room);
  broadcastToRoom(room, { action: "roomUpdated", room });
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

/**
 * Either player can request a rematch once the match has ended. The first
 * request just flags that player and notifies the opponent; nothing starts
 * until the opponent also requests one (their "accept"), at which point a
 * fresh match begins immediately — new board, new secrets, same two players.
 */
export async function requestRematch(connectionId: string): Promise<GameRoom> {
  const { roomCode } = getConnectionEntry(connectionId);

  for (let attempt = 0; attempt < 3; attempt++) {
    const room = await requireRoom(roomCode);
    if (room.status !== "FINISHED" && room.status !== "FORFEITED") {
      throw new GameError(409, "Game is not finished yet");
    }
    if (!room.players.player2) {
      throw new GameError(409, "Opponent not in room");
    }

    const slot = findPlayerSlotByConnectionId(room, connectionId);
    if (!slot) throw new GameError(403, "Player not in room");
    if (room.players[slot]!.rematchRequested) {
      return room;
    }

    room.players[slot]!.rematchRequested = true;
    room.updatedAt = new Date().toISOString();
    await saveRoom(room);

    const saved = await requireRoom(roomCode);
    if (!saved.players[slot]!.rematchRequested) continue;

    const opponentSlot: TurnPlayer = slot === "player1" ? "player2" : "player1";
    if (!saved.players[opponentSlot]?.rematchRequested) {
      broadcastToRoom(saved, { action: "roomUpdated", room: saved });
      return saved;
    }

    const { board, boardGenders } = pickBoard(BOARD_SIZE, saved.modifiers.generation);
    const secret1 = pickSecretFromBoard(board, boardGenders);
    const secret2 = pickSecretFromBoard(board, boardGenders);
    const rematchedRoom: GameRoom = {
      ...saved,
      status: "ACTIVE",
      board,
      boardGenders,
      currentTurnPlayer: resolveStartingPlayer(saved.modifiers.firstPlayer),
      turnCount: 0,
      winner: undefined,
      updatedAt: new Date().toISOString(),
      players: {
        player1: {
          ...saved.players.player1!,
          secretPokemonId: secret1.secretPokemonId,
          secretGender: secret1.secretGender,
          guess: undefined,
          rematchRequested: false,
        },
        player2: {
          ...saved.players.player2!,
          secretPokemonId: secret2.secretPokemonId,
          secretGender: secret2.secretGender,
          guess: undefined,
          rematchRequested: false,
        },
      },
    };

    await saveRoom(rematchedRoom);
    broadcastToRoom(rematchedRoom, { action: "gameStarted", room: rematchedRoom });
    return rematchedRoom;
  }

  throw new GameError(500, "Failed to request rematch");
}

/** Lightweight liveness ping — its only job is to trigger `resolveExpiredDisconnects`. */
export async function touchRoomForConnection(connectionId: string): Promise<void> {
  const { roomCode } = getConnectionEntry(connectionId);
  await requireRoom(roomCode);
}
