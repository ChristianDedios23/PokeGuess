import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env";

// Explicit credentials are only passed for local dev against a local DynamoDB
// endpoint. In production, DYNAMODB_ENDPOINT is unset and the AWS SDK's default
// credential provider chain picks up the EC2 instance role via IMDS instead —
// passing any explicit credentials object here would take priority over that
// and break the instance-role flow.
const dynamoClient = new DynamoDBClient({
  region: env.awsRegion,
  ...(env.dynamodbEndpoint
    ? {
        endpoint: env.dynamodbEndpoint,
        credentials: {
          accessKeyId: env.awsAccessKeyId,
          secretAccessKey: env.awsSecretAccessKey,
        },
      }
    : {}),
});

export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export { dynamoClient };
