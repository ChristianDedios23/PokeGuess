import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

export const GAME_ROOMS_TABLE = "GameRooms";
export const GAME_ROOMS_TTL_ATTRIBUTE = "expiresAt";

export const tableDefinitions: CreateTableCommandInput[] = [
  {
    TableName: GAME_ROOMS_TABLE,
    KeySchema: [{ AttributeName: "roomCode", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "roomCode", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
];
