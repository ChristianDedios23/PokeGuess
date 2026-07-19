import { GameError } from "../types/errors";
import { touchRoomForConnection } from "../services/roomService";
import type { HandlerContext } from "./types";

/**
 * Sent periodically by connected clients. Its only purpose is to trigger a
 * fresh room read, which lazily resolves any expired disconnect grace period
 * (see `resolveExpiredDisconnects` in roomService) without needing a
 * scheduled timer that wouldn't survive a restart or a different instance.
 */
export async function handlePing(ctx: HandlerContext): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "You're not connected to a room right now.");
  await touchRoomForConnection(ctx.connectionId);
}
