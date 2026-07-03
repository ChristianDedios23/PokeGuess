import "dotenv/config";
import { createServer } from "http";
import { app } from "./app";
import { setupWebSocketServer, WS_PATH } from "./websocket";

const PORT = parseInt(process.env.PORT || "3000", 10);

const server = createServer(app);
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API docs at http://localhost:${PORT}/api-docs`);
  console.log(`WebSocket at ws://localhost:${PORT}${WS_PATH}`);
});
