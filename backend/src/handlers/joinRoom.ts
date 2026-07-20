import { getRoom } from "../db/rooms";
import { GameError } from "../types/errors";
import { attachPlayer } from "../services/connectionRegistry";
import { joinRoom } from "../services/roomService";
import { broadcastToRoom, sendRoomToConnection } from "../utils/websocket";
import type { HandlerContext, WsMessage } from "./types";

export async function handleJoinRoom(ctx: HandlerContext, msg: WsMessage): Promise<void> {
  const roomCode = msg.roomCode as string | undefined;
  const displayName = msg.displayName as string | undefined;
  if (!roomCode || !displayName) {
    throw new GameError(400, "roomCode and displayName are required");
  }

  const { playerToken } = await joinRoom(roomCode, displayName);
  const connectionId = await attachPlayer(ctx.ws, roomCode, "player2");
  ctx.setConnectionId(connectionId);

  const updatedRoom = (await getRoom(roomCode))!;
  broadcastToRoom(updatedRoom, { action: "playerJoined", room: updatedRoom }, connectionId);

  sendRoomToConnection(ctx.ws, updatedRoom, "player2", {
    action: "joined",
    connectionId,
    roomCode,
    isHost: false,
    playerToken,
  });
}
