import { API_BASE } from "./config";

export type RoomStatus = "WAITING" | "ACTIVE" | "FINISHED" | "FORFEITED";

export interface RoomPlayer {
  connectionId: string;
  displayName: string;
  secretPokemonId: number;
  connected: boolean;
  ready: boolean;
}

export interface GameRoom {
  roomCode: string;
  status: RoomStatus;
  players: {
    player1?: RoomPlayer;
    player2?: RoomPlayer;
  };
  currentTurnPlayer?: "player1" | "player2";
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
  | WsRegistered
  | WsRoomUpdated
  | WsPlayerJoined
  | WsGameStarted
  | WsChatMessage
  | WsChatMessageSent
  | WsError;

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data as T;
}

export async function createRoom(displayName: string) {
  return apiPost<{ roomCode: string; room: GameRoom }>("/game/createRoom", { displayName });
}

export async function joinRoom(roomCode: string, displayName: string) {
  return apiPost<{ room: GameRoom }>("/game/joinRoom", { roomCode, displayName });
}

export async function readyUp(connectionId: string) {
  return apiPost<{ room: GameRoom }>("/game/readyUp", { connectionId });
}

export async function startGame(connectionId: string) {
  return apiPost<{ room: GameRoom }>("/game/startGame", { connectionId });
}

export async function sendChatMessage(connectionId: string, message: string) {
  return apiPost<{ ok: boolean; sentAt: string }>("/game/sendChatMessage", {
    connectionId,
    message,
  });
}
