import type { GameRoom, PokemonGender, RoomPlayer, TurnPlayer } from "../db/types";

/** Wire-facing player: no session hash; secrets only for self (or after game ends). */
export type PublicRoomPlayer = Omit<RoomPlayer, "playerTokenHash" | "secretPokemonId" | "secretGender" | "guess"> & {
  secretPokemonId?: number;
  secretGender?: PokemonGender;
  guess?: { pokemonId: number; correct?: boolean };
};

export type PublicGameRoom = Omit<GameRoom, "players"> & {
  players: {
    player1?: PublicRoomPlayer;
    player2?: PublicRoomPlayer;
  };
};

/**
 * Per-viewer room snapshot for WebSocket payloads.
 * - Never sends playerTokenHash
 * - Hides the opponent's secret until the match has ended
 * - Hides whether the opponent's guess was correct until the match has ended
 */
export function sanitizeRoomForViewer(room: GameRoom, viewer: TurnPlayer): PublicGameRoom {
  const revealSecrets = room.status === "FINISHED" || room.status === "FORFEITED";

  return {
    ...room,
    players: {
      player1: sanitizePlayer(room.players.player1, "player1", viewer, revealSecrets),
      player2: sanitizePlayer(room.players.player2, "player2", viewer, revealSecrets),
    },
  };
}

function sanitizePlayer(
  player: RoomPlayer | undefined,
  slot: TurnPlayer,
  viewer: TurnPlayer,
  revealSecrets: boolean,
): PublicRoomPlayer | undefined {
  if (!player) return undefined;

  const isSelf = slot === viewer;
  const { playerTokenHash: _hash, guess, secretPokemonId, secretGender, ...rest } = player;

  const publicPlayer: PublicRoomPlayer = { ...rest };

  if (isSelf || revealSecrets) {
    publicPlayer.secretPokemonId = secretPokemonId;
    publicPlayer.secretGender = secretGender;
  }

  if (guess) {
    if (isSelf || revealSecrets) {
      publicPlayer.guess = { pokemonId: guess.pokemonId, correct: guess.correct };
    } else {
      // Opponent may know a final guess was locked in, but not whether it hit.
      publicPlayer.guess = { pokemonId: guess.pokemonId };
    }
  }

  return publicPlayer;
}
