import { verifyDynamoConnection } from "../../src/db/health";
import type { GameRoom } from "../../src/db/types";

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
    players: {},
    createdAt: now,
    updatedAt: now,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
}
