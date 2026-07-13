import { GameError } from "../types/errors";
import { registerConnection } from "../services/roomService";
import type { HandlerContext, WsMessage } from "./types";

export async function handleRegister(ctx: HandlerContext, msg: WsMessage): Promise<void> {
  const roomCode = msg.roomCode as string | undefined;
  const displayName = msg.displayName as string | undefined;
  const playerToken = msg.playerToken as string | undefined;
  if (!roomCode || !displayName) {
    throw new GameError(400, "roomCode and displayName are required");
  }

  const result = await registerConnection(ctx.ws, roomCode, displayName, playerToken);
  ctx.setConnectionId(result.connectionId);
}
