import { wsRequest } from "./wsClient";

export type RoomStatus = "WAITING" | "ACTIVE" | "FINISHED" | "FORFEITED";
export type PokemonGender = "male" | "female" | "genderless";

/** "all" means every generation; otherwise a list of selected gen numbers. */
export type GenerationSelection = "all" | number[];
export type LeaveTimerValue = "enable" | "disable";
export type PlayModeValue = "structured" | "freeplay";
export type GuessingRuleValue = "classic" | "final-showdown" | "casual";
export type OpponentInteractValue = "yes" | "no";
export type LimitedTurnsValue = "unlimited" | number;
/** Who starts in structured play. "random" is re-rolled each match/rematch. */
export type FirstPlayerValue = "random" | "player1" | "player2";

/** Host-configurable rules that shape how a match plays. Mirrors the backend. */
export interface GameModifiers {
  generation: GenerationSelection;
  leaveTimer: LeaveTimerValue;
  playMode: PlayModeValue;
  guessingRule: GuessingRuleValue;
  opponentInteract: OpponentInteractValue;
  limitedTurns: LimitedTurnsValue;
  firstPlayer: FirstPlayerValue;
}

export const DEFAULT_MODIFIERS: GameModifiers = {
  generation: "all",
  leaveTimer: "enable",
  playMode: "structured",
  guessingRule: "classic",
  opponentInteract: "no",
  limitedTurns: "unlimited",
  firstPlayer: "random",
};

export interface RoomPlayer {
  connectionId: string;
  displayName: string;
  /** Only present for yourself, or for both players after the match ends. */
  secretPokemonId?: number;
  secretGender?: PokemonGender;
  connected: boolean;
  ready: boolean;
  disconnectedAt?: string;
  guess?: PlayerGuess;
  rematchRequested?: boolean;
}

export interface PlayerGuess {
  pokemonId: number;
  /** Omitted for the opponent until the match ends. */
  correct?: boolean;
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
  modifiers: GameModifiers;
  currentTurnPlayer?: "player1" | "player2";
  /** Turns taken so far (structured play + limited turns). */
  turnCount?: number;
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
  const data = await wsRequest<WsRoomCreated>(
    "createRoom",
    { displayName },
    { connectionErrorMessage: "There was an error creating your room. Please try again." },
  );
  return {
    roomCode: data.roomCode,
    room: data.room,
    connectionId: data.connectionId,
    playerToken: data.playerToken,
  };
}

export async function joinRoom(roomCode: string, displayName: string) {
  const data = await wsRequest<WsJoined>(
    "joinRoom",
    { roomCode, displayName },
    { connectionErrorMessage: "There was an error joining the room. Please try again." },
  );
  return { room: data.room, connectionId: data.connectionId, playerToken: data.playerToken };
}
