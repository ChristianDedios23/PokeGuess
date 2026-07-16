import type { HandlerContext, WsMessage } from "./types";
import { GameError } from "../types/errors";
import { sendJson } from "../utils/websocket";
import { handleCreateRoom } from "./createRoom";
import { handleForfeitGame } from "./forfeitGame";
import { handleJoinRoom } from "./joinRoom";
import { handleLeaveRoom } from "./leaveRoom";
import { handleMakeGuess } from "./makeGuess";
import { handlePing } from "./ping";
import { handleRegister } from "./register";
import { handleReadyUp } from "./readyUp";
import { handleRequestRematch } from "./requestRematch";
import { handleSendChatMessage } from "./sendChatMessage";
import { handleStartGame } from "./startGame";
import { handleDisconnect as disconnectConnection } from "../services/connectionRegistry";

const NOT_IMPLEMENTED = new Set(["endTurn"]);

function parseMessage(raw: unknown): WsMessage {
  const text =
    typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
  const parsed: unknown = JSON.parse(text);

  if (typeof parsed !== "object" || parsed === null || typeof (parsed as WsMessage).action !== "string") {
    throw new GameError(400, "Invalid message format");
  }

  return parsed as WsMessage;
}

export async function handleMessage(ctx: HandlerContext, raw: unknown): Promise<void> {
  const startedAt = performance.now();
  let actionLabel = "unknown";

  try {
    const msg = parseMessage(raw);
    actionLabel = msg.action;

    if (NOT_IMPLEMENTED.has(msg.action)) {
      throw new GameError(501, `${msg.action} is not implemented yet`);
    }

    switch (msg.action) {
      case "createRoom":
        await handleCreateRoom(ctx, msg);
        break;
      case "joinRoom":
        await handleJoinRoom(ctx, msg);
        break;
      case "register":
        await handleRegister(ctx, msg);
        break;
      case "readyUp":
        await handleReadyUp(ctx);
        break;
      case "startGame":
        await handleStartGame(ctx);
        break;
      case "makeGuess":
        await handleMakeGuess(ctx, msg);
        break;
      case "forfeitGame":
        await handleForfeitGame(ctx);
        break;
      case "requestRematch":
        await handleRequestRematch(ctx);
        break;
      case "leaveRoom":
        await handleLeaveRoom(ctx);
        break;
      case "ping":
        await handlePing(ctx);
        break;
      case "sendChatMessage":
        await handleSendChatMessage(ctx, msg);
        break;
      default:
        throw new GameError(400, `Unknown action: ${msg.action}`);
    }

    const durationMs = Math.round(performance.now() - startedAt);
    if (actionLabel !== "ping") {
      console.log(
        `[${new Date().toISOString()}] WS ${actionLabel} → ok (${durationMs}ms)`,
      );
    }
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const message = error instanceof GameError ? error.message : "Internal server error";
    const durationMs = Math.round(performance.now() - startedAt);
    if (actionLabel !== "ping") {
      console.log(
        `[${new Date().toISOString()}] WS ${actionLabel} → ${status} (${durationMs}ms)`,
      );
    }
    sendJson(ctx.ws, { action: "error", status, message });
  }
}

export async function handleDisconnect(connectionId?: string): Promise<void> {
  if (!connectionId) return;
  await disconnectConnection(connectionId);
}
