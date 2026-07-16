import { wsRequest } from "./wsClient";

export type RoomStatus = "WAITING" | "ACTIVE" | "FINISHED" | "FORFEITED";
export type PokemonGender = "male" | "female" | "genderless";

export interface PlayerGuess {
  pokemonId: number;
  correct: boolean;
}

export interface RoomPlayer {
  connectionId: string;
  displayName: string;
  secretPokemonId: number;
  secretGender: PokemonGender;
  connected: boolean;
  ready: boolean;
  disconnectedAt?: string;
  guess?: PlayerGuess;
  rematchRequested?: boolean;
}

/**
 * Mirrors the backend's default FORFEIT_GRACE_MS (see backend/src/config/env.ts).
 * Not transmitted over the wire, so this is the client's best estimate of how
 * long a disconnected opponent has left to reconnect before auto-forfeiting.
 */
export const FORFEIT_GRACE_MS = 30_000;

export interface GameRoom {
  roomCode: string;
  status: RoomStatus;
  board: number[];
  boardGenders: PokemonGender[];
  players: {
    player1?: RoomPlayer;
    player2?: RoomPlayer;
  };
  currentTurnPlayer?: "player1" | "player2";
  winner?: "player1" | "player2";
  createdAt: string;
  updatedAt: string;
  expiresAt: number;
}

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  sentAt: string;
  isSelf: boolean;
}

export interface WsRoomCreated {
  action: "roomCreated";
  connectionId: string;
  roomCode: string;
  isHost: boolean;
  playerToken: string;
  room: GameRoom;
}

export interface WsJoined {
  action: "joined";
  connectionId: string;
  roomCode: string;
  isHost: boolean;
  playerToken: string;
  room: GameRoom;
}

export interface WsRegistered {
  action: "registered";
  connectionId: string;
  roomCode: string;
  displayName: string;
  isHost: boolean;
  room: GameRoom;
}

export interface WsRoomUpdated {
  action: "roomUpdated";
  room: GameRoom;
}

export interface WsPlayerJoined {
  action: "playerJoined";
  room: GameRoom;
}

export interface WsGameStarted {
  action: "gameStarted";
  room: GameRoom;
}

export interface WsGameOver {
  action: "gameOver";
  room: GameRoom;
  forfeitedBy?: "player1" | "player2";
  reason?: "forfeit" | "disconnect_timeout";
}

export interface WsChatMessage {
  action: "chatMessage";
  roomCode: string;
  fromConnectionId: string;
  fromDisplayName: string;
  message: string;
  sentAt: string;
}

export interface WsChatMessageSent {
  action: "chatMessageSent";
  roomCode: string;
  message: string;
  sentAt: string;
}

export interface WsError {
  action: "error";
  status: number;
  message: string;
}

export type WsPayload =
  | WsRoomCreated
  | WsJoined
  | WsRegistered
  | WsRoomUpdated
  | WsPlayerJoined
  | WsGameStarted
  | WsGameOver
  | WsChatMessage
  | WsChatMessageSent
  | WsError;

export type WsAction = Record<string, unknown> & { action: string };

export async function createRoom(displayName: string) {
  const data = await wsRequest<WsRoomCreated>("createRoom", { displayName });
  return {
    roomCode: data.roomCode,
    room: data.room,
    connectionId: data.connectionId,
    playerToken: data.playerToken,
  };
}

export async function joinRoom(roomCode: string, displayName: string) {
  const data = await wsRequest<WsJoined>("joinRoom", { roomCode, displayName });
  return { room: data.room, connectionId: data.connectionId, playerToken: data.playerToken };
}
