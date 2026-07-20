import { verifyDynamoConnection } from "../../src/db/health";
import type { GameRoom } from "../../src/db/types";
import { DEFAULT_MODIFIERS } from "../../src/services/modifiers";

export async function isDynamoAvailable(): Promise<boolean> {
  try {
    await verifyDynamoConnection();
    return true;
  } catch {
    return false;
  }
}

export function makeTestRoom(roomCode: string): GameRoom {
  const now = new Date().toISOString();
  return {
    roomCode,
    status: "WAITING",
    board: [],
    boardGenders: [],
    players: {},
    modifiers: { ...DEFAULT_MODIFIERS },
    createdAt: now,
    updatedAt: now,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
}
