import { GameError } from "../types/errors";
import { makeGuess } from "../services/roomService";
import type { HandlerContext, WsMessage } from "./types";

export async function handleMakeGuess(ctx: HandlerContext, msg: WsMessage): Promise<void> {
  if (!ctx.connectionId) throw new GameError(403, "Not connected");

  const pokemonId = msg.pokemonId;
  if (typeof pokemonId !== "number" || !Number.isInteger(pokemonId)) {
    throw new GameError(400, "pokemonId is required");
  }

  await makeGuess(ctx.connectionId, pokemonId);
}
