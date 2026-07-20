export type RoomStatus = "WAITING" | "ACTIVE" | "FINISHED" | "FORFEITED";
export type TurnPlayer = "player1" | "player2";
export type PokemonGender = "male" | "female" | "genderless";

/** "all" = every generation; otherwise a list of selected generation numbers. */
export type GenerationSelection = "all" | number[];
export type LeaveTimerMode = "enable" | "disable";
export type PlayMode = "structured" | "freeplay";
export type GuessingRule = "classic" | "final-showdown" | "casual";
export type OpponentInteract = "yes" | "no";
/** "unlimited" or a per-player turn cap (5–20). Only used in structured mode. */
export type LimitedTurns = "unlimited" | number;
/** Who starts in structured play. "random" is re-rolled each match/rematch. */
export type FirstPlayer = "random" | "player1" | "player2";

/** Host-configurable rules that shape how a match plays. */
export interface GameModifiers {
  generation: GenerationSelection;
  leaveTimer: LeaveTimerMode;
  playMode: PlayMode;
  guessingRule: GuessingRule;
  opponentInteract: OpponentInteract;
  limitedTurns: LimitedTurns;
  firstPlayer: FirstPlayer;
}

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
  modifiers: GameModifiers;
  currentTurnPlayer?: TurnPlayer;
  /** Turns taken so far this match (structured play + limited turns). */
  turnCount?: number;
  winner?: TurnPlayer;
  createdAt: string;
  updatedAt: string;
  expiresAt: number;
}
