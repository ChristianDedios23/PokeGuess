import { WebSocket } from "ws";
import { getRoom } from "../db/rooms";
import type { TurnPlayer } from "../db/types";
import { GameError } from "../types/errors";
import { sendJson } from "../utils/websocket";
import { connections, getConnectionEntry } from "./connectionRegistry";

const MAX_MESSAGE_LENGTH = 500;

export async function relayChatMessage(
  connectionId: string,
  text: string,
): Promise<{ sentAt: string }> {
  const message = text.trim();
  if (!message) throw new GameError(400, "Message cannot be empty");
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new GameError(400, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
  }

  getConnectionEntry(connectionId);
  const room = await getRoom(connections.get(connectionId)!.roomCode);
  if (!room) throw new GameError(404, "Room not found");
  if (room.status !== "ACTIVE") {
    throw new GameError(409, "Chat is only available after the game has started");
  }

  const senderSlot: TurnPlayer | null =
    room.players.player1?.connectionId === connectionId
      ? "player1"
      : room.players.player2?.connectionId === connectionId
        ? "player2"
        : null;
  if (!senderSlot) throw new GameError(403, "Player not in room");

  const sender = room.players[senderSlot]!;
  const opponentSlot: TurnPlayer = senderSlot === "player1" ? "player2" : "player1";
  const opponent = room.players[opponentSlot];
  if (!opponent) throw new GameError(409, "Opponent not in room yet");

  const opponentConn = connections.get(opponent.connectionId);
  if (!opponentConn || opponentConn.ws.readyState !== WebSocket.OPEN) {
    throw new GameError(409, "Opponent is not connected");
  }

  const sentAt = new Date().toISOString();
  sendJson(opponentConn.ws, {
    action: "chatMessage",
    roomCode: room.roomCode,
    fromConnectionId: sender.connectionId,
    fromDisplayName: sender.displayName,
    message,
    sentAt,
  });

  const senderConn = connections.get(sender.connectionId);
  if (senderConn) {
    sendJson(senderConn.ws, {
      action: "chatMessageSent",
      roomCode: room.roomCode,
      message,
      sentAt,
    });
  }

  return { sentAt };
}
