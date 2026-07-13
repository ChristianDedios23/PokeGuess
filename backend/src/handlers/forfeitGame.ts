import { GameError } from "../types/errors";
import { forfeitGame } from "../services/roomService";
import type { HandlerContext } from "./types";

export async function handleForfeitGame(ctx: HandlerContext): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "Not connected");

  await forfeitGame(ctx.connectionId);
}
