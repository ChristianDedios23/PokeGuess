import { GameError } from "../types/errors";
import { relayChatMessage } from "../services/chatService";
import type { HandlerContext, WsMessage } from "./types";

export async function handleSendChatMessage(ctx: HandlerContext, msg: WsMessage): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "Not connected");

  const message = msg.message;
  if (message === undefined) throw new GameError(400, "message is required");

  await relayChatMessage(ctx.connectionId, String(message));
}
