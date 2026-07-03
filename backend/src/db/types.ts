export type RoomStatus = "WAITING" | "ACTIVE" | "FINISHED" | "FORFEITED";
export type TurnPlayer = "player1" | "player2";

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
  currentTurnPlayer?: TurnPlayer;
  createdAt: string;
  updatedAt: string;
  expiresAt: number;
}
