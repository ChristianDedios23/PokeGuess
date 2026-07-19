import { GameError } from "../types/errors";
import type { HandlerContext } from "./types";

/**
 * A voluntary "close the game" — unlike forfeitGame this doesn't end the
 * match immediately. Closing the socket runs the same disconnect path as a
 * dropped connection, which starts the reconnect grace period.
 */
export async function handleLeaveRoom(ctx: HandlerContext): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "You're not connected to a room right now.");

  ctx.ws.close();
}
