import "dotenv/config";
import { createServer } from "http";
import { app } from "./app";
import { dynamoConnectionHelp, verifyDynamoConnection } from "./db/health";
import { setupWebSocketServer, WS_PATH } from "./ws/server";
import { env } from "./config/env";

async function main() {
  try {
    await verifyDynamoConnection();
    console.log(`DynamoDB connected at ${env.dynamodbEndpoint}`);
  } catch (error) {
    console.error("DynamoDB connection failed:", dynamoConnectionHelp(error));
    process.exit(1);
  }

  const server = createServer(app);
  setupWebSocketServer(server);

  server.listen(env.port, () => {
    console.log(`Server running at http://localhost:${env.port}`);
    console.log(`WebSocket at ws://localhost:${env.port}${WS_PATH}`);
  });
}

main();
