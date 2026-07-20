import { GameError } from "../types/errors";
import { updateRoomModifiers } from "../services/roomService";
import type { HandlerContext, WsMessage } from "./types";

export async function handleUpdateModifiers(
  ctx: HandlerContext,
  msg: WsMessage,
): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "You're not connected to a room right now.");

  await updateRoomModifiers(ctx.connectionId, msg.modifiers);
}
