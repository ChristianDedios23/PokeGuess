import { getRoom } from "../db/rooms";
import { GameError } from "../types/errors";
import { attachPlayer } from "../services/connectionRegistry";
import { createRoom } from "../services/roomService";
import { sendRoomToConnection } from "../utils/websocket";
import type { HandlerContext, WsMessage } from "./types";

export async function handleCreateRoom(ctx: HandlerContext, msg: WsMessage): Promise<void> {
  const displayName = msg.displayName as string | undefined;
  if (!displayName) throw new GameError(400, "displayName is required");

  const { room, playerToken } = await createRoom(displayName);
  const connectionId = await attachPlayer(ctx.ws, room.roomCode, "player1");
  ctx.setConnectionId(connectionId);

  const updatedRoom = (await getRoom(room.roomCode))!;

  sendRoomToConnection(ctx.ws, updatedRoom, "player1", {
    action: "roomCreated",
    connectionId,
    roomCode: room.roomCode,
    isHost: true,
    playerToken,
  });
}
