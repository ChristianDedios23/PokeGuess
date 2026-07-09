import type { Server } from "http";
import { isDynamoAvailable } from "./helpers/dynamo";
import { startWsTestServer, stopWsTestServer } from "./helpers/testServer";
import { openSocket, waitForAction, waitForBothReady, wsOnce } from "./helpers/ws";

describe("WebSocket game flow", () => {
  let dynamoAvailable = false;
  let server: Server;
  let wsUrl: string;

  beforeAll(async () => {
    dynamoAvailable = await isDynamoAvailable();
    if (!dynamoAvailable) {
      console.warn("Skipping WebSocket tests — DynamoDB is not available");
      return;
    }

    const started = await startWsTestServer();
    server = started.server;
    wsUrl = started.wsUrl;
  });

  afterAll(async () => {
    if (server) await stopWsTestServer(server);
  });

  it("runs create → register → join → ready → start → chat", async () => {
    if (!dynamoAvailable) return;

    const created = await wsOnce<{ roomCode: string }>(
      wsUrl,
      { action: "createRoom", displayName: "Host" },
      (d) => d.action === "roomCreated",
    );
    const roomCode = created.roomCode;

    const host = await openSocket(wsUrl);
    host.send(JSON.stringify({ action: "register", roomCode, displayName: "Host" }));
    await waitForAction(host, "registered");

    await wsOnce(
      wsUrl,
      { action: "joinRoom", roomCode, displayName: "Guest" },
      (d) => d.action === "joined",
    );

    const guest = await openSocket(wsUrl);
    guest.send(JSON.stringify({ action: "register", roomCode, displayName: "Guest" }));
    await waitForAction(guest, "registered");

    const bothReady = waitForBothReady([host, guest]);
    host.send(JSON.stringify({ action: "readyUp" }));
    guest.send(JSON.stringify({ action: "readyUp" }));
    await bothReady;

    const gameStarted = Promise.race([
      waitForAction(host, "gameStarted"),
      waitForAction(guest, "gameStarted"),
    ]);
    host.send(JSON.stringify({ action: "startGame" }));
    await gameStarted;

    const chatReceived = waitForAction(host, "chatMessage");
    guest.send(JSON.stringify({ action: "sendChatMessage", message: "hello" }));
    const chat = await chatReceived;
    expect((chat as { message?: string }).message).toBe("hello");

    host.close();
    guest.close();
  });
});
