import "dotenv/config";
import {
  CreateTableCommand,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  ResourceInUseException,
  ResourceNotFoundException,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { dynamoClient } from "./client";
import { GAME_ROOMS_TABLE, GAME_ROOMS_TTL_ATTRIBUTE, tableDefinitions } from "./tables";

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false;
    }
    throw error;
  }
}

async function createTable(definition: (typeof tableDefinitions)[number]) {
  const tableName = definition.TableName;
  if (!tableName) {
    throw new Error("Table definition is missing TableName");
  }

  if (await tableExists(tableName)) {
    console.log(`Table already exists: ${tableName}`);
    return;
  }

  try {
    await dynamoClient.send(new CreateTableCommand(definition));
    console.log(`Created table: ${tableName}`);
  } catch (error) {
    if (error instanceof ResourceInUseException) {
      console.log(`Table already exists: ${tableName}`);
      return;
    }
    throw error;
  }
}

async function enableTtl(tableName: string, attributeName: string) {
  if (!(await tableExists(tableName))) {
    return;
  }

  try {
    const current = await dynamoClient.send(
      new DescribeTimeToLiveCommand({ TableName: tableName }),
    );

    const ttl = current.TimeToLiveDescription;
    if (ttl?.TimeToLiveStatus === "ENABLED" && ttl.AttributeName === attributeName) {
      console.log(`TTL already enabled on ${tableName}.${attributeName}`);
      return;
    }

    await dynamoClient.send(
      new UpdateTimeToLiveCommand({
        TableName: tableName,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: attributeName,
        },
      }),
    );
    console.log(`Enabled TTL on ${tableName}.${attributeName}`);
  } catch (error) {
    console.warn(
      `Could not enable TTL on ${tableName}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

async function main() {
  for (const definition of tableDefinitions) {
    await createTable(definition);
  }

  await enableTtl(GAME_ROOMS_TABLE, GAME_ROOMS_TTL_ATTRIBUTE);
}

main().catch((error) => {
  console.error("Failed to set up DynamoDB tables:", error);
  process.exit(1);
});
