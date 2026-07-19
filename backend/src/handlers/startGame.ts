import { GameError } from "../types/errors";
import { startGameForRoom } from "../services/roomService";
import type { HandlerContext } from "./types";

export async function handleStartGame(ctx: HandlerContext): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "You're not connected to a room right now.");

  await startGameForRoom(ctx.connectionId);
}
