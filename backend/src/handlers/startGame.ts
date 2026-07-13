import { GameError } from "../types/errors";
import { startGameForRoom } from "../services/roomService";
import type { HandlerContext } from "./types";

export async function handleStartGame(ctx: HandlerContext): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "Not connected");

  await startGameForRoom(ctx.connectionId);
}
