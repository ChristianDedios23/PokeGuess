import type { GameRoom, RoomPlayer } from "../src/db/types";
import { DEFAULT_MODIFIERS } from "../src/services/modifiers";
import { sanitizeRoomForViewer } from "../src/utils/roomView";

function makePlayer(overrides: Partial<RoomPlayer> = {}): RoomPlayer {
  return {
    displayName: "Ash",
    ready: true,
    connected: true,
    connectionId: "conn-1",
    secretPokemonId: 25,
    secretGender: "male",
    playerTokenHash: "hash-should-never-leak",
    ...overrides,
  };
}

function makeRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    roomCode: "ABCD",
    status: "ACTIVE",
    board: [1, 2, 3],
    boardGenders: ["male", "female", "genderless"],
    modifiers: DEFAULT_MODIFIERS,
    currentTurnPlayer: "player1",
    turnCount: 0,
    players: {
      player1: makePlayer({ displayName: "Host", connectionId: "h1", secretPokemonId: 1 }),
      player2: makePlayer({
        displayName: "Guest",
        connectionId: "g1",
        secretPokemonId: 2,
        guess: { pokemonId: 1, correct: true },
      }),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

describe("sanitizeRoomForViewer", () => {
  it("strips token hashes and hides the opponent secret mid-match", () => {
    const room = makeRoom();
    const forHost = sanitizeRoomForViewer(room, "player1");

    expect(forHost.players.player1).not.toHaveProperty("playerTokenHash");
    expect(forHost.players.player2).not.toHaveProperty("playerTokenHash");
    expect(forHost.players.player1?.secretPokemonId).toBe(1);
    expect(forHost.players.player2?.secretPokemonId).toBeUndefined();
    expect(forHost.players.player2?.guess).toEqual({ pokemonId: 1 });
  });

  it("reveals secrets and guess correctness after the match ends", () => {
    const room = makeRoom({ status: "FINISHED", winner: "player1" });
    const forHost = sanitizeRoomForViewer(room, "player1");

    expect(forHost.players.player2?.secretPokemonId).toBe(2);
    expect(forHost.players.player2?.guess).toEqual({ pokemonId: 1, correct: true });
  });
});
