export type RoomStatus = "WAITING" | "ACTIVE" | "FINISHED" | "FORFEITED";
export type TurnPlayer = "player1" | "player2";

export interface PlayerGuess {
  pokemonId: number;
  correct: boolean;
}

export interface RoomPlayer {
  connectionId: string;
  displayName: string;
  secretPokemonId: number;
  connected: boolean;
  ready: boolean;
  playerTokenHash: string;
  disconnectedAt?: string;
  guess?: PlayerGuess;
}

export interface GameRoom {
  roomCode: string;
  status: RoomStatus;
  board: number[];
  players: {
    player1?: RoomPlayer;
    player2?: RoomPlayer;
  };
  currentTurnPlayer?: TurnPlayer;
  winner?: TurnPlayer;
  createdAt: string;
  updatedAt: string;
  expiresAt: number;
}
