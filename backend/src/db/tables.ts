import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

export const GAME_ROOMS_TABLE = "GameRooms";
export const GAME_ROOMS_TTL_ATTRIBUTE = "expiresAt";

export const FEEDBACK_TABLE = "FeedbackReports";

export const tableDefinitions: CreateTableCommandInput[] = [
  {
    TableName: GAME_ROOMS_TABLE,
    KeySchema: [{ AttributeName: "roomCode", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "roomCode", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    // No TTL — bug reports and feedback stick around until someone reviews
    // and manually clears them out, unlike the ephemeral game rooms.
    TableName: FEEDBACK_TABLE,
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
];
