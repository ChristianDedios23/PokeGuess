import { GameError } from "../types/errors";
import { forfeitGame } from "../services/roomService";
import type { HandlerContext } from "./types";

export async function handleForfeitGame(ctx: HandlerContext): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "You're not connected to a room right now.");

  await forfeitGame(ctx.connectionId);
}
