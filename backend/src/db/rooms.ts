import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getPokemonById, rollGender } from "../data/pokemon";
import { DEFAULT_MODIFIERS } from "../services/modifiers";
import { docClient } from "./client";
import { GAME_ROOMS_TABLE } from "./tables";
import type { GameRoom, PokemonGender, RoomPlayer } from "./types";

function genderForPokemonId(pokemonId: number): PokemonGender {
  return rollGender(getPokemonById(pokemonId)?.genderRate ?? -1);
}

function normalizePlayer(player: RoomPlayer | undefined): RoomPlayer | undefined {
  if (!player) return player;
  if (player.secretGender) return player;
  return {
    ...player,
    secretGender: genderForPokemonId(player.secretPokemonId),
  };
}

function normalizeRoom(room: GameRoom): GameRoom {
  const boardGenders: PokemonGender[] =
    room.boardGenders?.length === room.board.length
      ? room.boardGenders
      : room.board.map((id) => genderForPokemonId(id));

  return {
    ...room,
    boardGenders,
    // Backfill rooms created before modifiers existed.
    modifiers: { ...DEFAULT_MODIFIERS, ...room.modifiers },
    players: {
      player1: normalizePlayer(room.players.player1),
      player2: normalizePlayer(room.players.player2),
    },
  };
}

export async function getRoom(roomCode: string): Promise<GameRoom | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: GAME_ROOMS_TABLE,
      Key: { roomCode },
    }),
  );

  const room = (result.Item as GameRoom | undefined) ?? null;
  return room ? normalizeRoom(room) : null;
}

export async function saveRoom(room: GameRoom): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: GAME_ROOMS_TABLE,
      Item: room,
    }),
  );
}
