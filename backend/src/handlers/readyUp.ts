import { GameError } from "../types/errors";
import { readyUpPlayer } from "../services/roomService";
import type { HandlerContext } from "./types";

export async function handleReadyUp(ctx: HandlerContext): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "You're not connected to a room right now.");

  await readyUpPlayer(ctx.connectionId);
}
