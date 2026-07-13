import "dotenv/config";

function parseIntEnv(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? String(fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const env = {
  port: parseIntEnv(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT ?? "http://127.0.0.1:8000",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local",
  forfeitGraceMs: parseIntEnv(process.env.FORFEIT_GRACE_MS, 30_000),
};
