import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./client";
import { GAME_ROOMS_TABLE } from "./tables";
import type { GameRoom } from "./types";

export async function getRoom(roomCode: string): Promise<GameRoom | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: GAME_ROOMS_TABLE,
      Key: { roomCode },
    }),
  );

  return (result.Item as GameRoom | undefined) ?? null;
}

export async function saveRoom(room: GameRoom): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: GAME_ROOMS_TABLE,
      Item: room,
    }),
  );
}
