import { GameError } from "../types/errors";
import { requestRematch } from "../services/roomService";
import type { HandlerContext } from "./types";

export async function handleRequestRematch(ctx: HandlerContext): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "You're not connected to a room right now.");

  await requestRematch(ctx.connectionId);
}
