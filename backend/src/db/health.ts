import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { env } from "../config/env";
import { dynamoClient } from "./client";
import { GAME_ROOMS_TABLE } from "./tables";

export async function verifyDynamoConnection(): Promise<void> {
  const result = await dynamoClient.send(new ListTablesCommand({}));
  const tables = result.TableNames ?? [];

  if (!tables.includes(GAME_ROOMS_TABLE)) {
    throw new Error(
      `DynamoDB is reachable at ${env.dynamodbEndpoint} but table "${GAME_ROOMS_TABLE}" is missing. Run: npm run db:setup`,
    );
  }
}

export function dynamoConnectionHelp(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const refused =
    message.includes("ECONNREFUSED") ||
    message.includes("NetworkingError") ||
    message.includes("connect ECONNREFUSED");

  if (refused) {
    return [
      `Cannot connect to DynamoDB at ${env.dynamodbEndpoint}.`,
      "Start local DynamoDB with: npm run db:up",
      "Then create tables with: npm run db:setup",
    ].join(" ");
  }

  return message;
}
