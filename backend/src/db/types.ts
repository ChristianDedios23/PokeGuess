export type RoomStatus = "WAITING" | "ACTIVE" | "FINISHED" | "FORFEITED";
export type TurnPlayer = "player1" | "player2";
export type PokemonGender = "male" | "female" | "genderless";

export type FeedbackCategory = "bug" | "feedback" | "visual";

export interface FeedbackReport {
  id: string;
  category: FeedbackCategory;
  message: string;
  pokemonRef?: string;
  email?: string;
  createdAt: string;
}

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
  playerTokenHash: string;
  disconnectedAt?: string;
  guess?: PlayerGuess;
  rematchRequested?: boolean;
}

export interface GameRoom {
  roomCode: string;
  status: RoomStatus;
  board: number[];
  /** Gender rolled for each board slot (same length/order as `board`). */
  boardGenders: PokemonGender[];
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
