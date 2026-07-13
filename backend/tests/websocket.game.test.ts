import type { Server } from "http";
import { env } from "../src/config/env";
import { getRoom } from "../src/db/rooms";
import { isDynamoAvailable } from "./helpers/dynamo";
import { startWsTestServer, stopWsTestServer } from "./helpers/testServer";
import { openSocket, setupActiveGame, waitForAction, wsOnce } from "./helpers/ws";

describe("WebSocket game flow", () => {
  let dynamoAvailable = false;
  let server: Server;
  let wsUrl: string;
  const defaultForfeitGraceMs = env.forfeitGraceMs;

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

  afterEach(() => {
    env.forfeitGraceMs = defaultForfeitGraceMs;
  });

  it("runs create → register → join → ready → start → chat → guess", async () => {
    if (!dynamoAvailable) return;

    const { roomCode, host, guest } = await setupActiveGame(wsUrl);

    const chatReceived = waitForAction(host, "chatMessage");
    guest.send(JSON.stringify({ action: "sendChatMessage", message: "hello" }));
    const chat = await chatReceived;
    expect((chat as { message?: string }).message).toBe("hello");

    const room = await getRoom(roomCode);
    expect(room!.board).toHaveLength(30);
    expect(new Set(room!.board).size).toBe(30);
    expect(room!.board).toContain(room!.players.player1!.secretPokemonId);
    expect(room!.board).toContain(room!.players.player2!.secretPokemonId);

    const hostSecretId = room!.players.player1!.secretPokemonId;
    const guestSecretId = room!.players.player2!.secretPokemonId;
    const wrongGuessId = room!.board.find((id) => id !== hostSecretId)!;

    // First guess (correct) should NOT end the match — the opponent still
    // gets a turn to guess before a winner is decided.
    const guestSeesRoomUpdate = waitForAction(guest, "roomUpdated");
    host.send(JSON.stringify({ action: "makeGuess", pokemonId: guestSecretId }));
    await guestSeesRoomUpdate;

    const stillActive = await getRoom(roomCode);
    expect(stillActive!.status).toBe("ACTIVE");
    expect(stillActive!.players.player1!.guess).toMatchObject({
      pokemonId: guestSecretId,
      correct: true,
    });

    const hostGameOver = waitForAction(host, "gameOver");
    const guestGameOver = waitForAction(guest, "gameOver");
    guest.send(JSON.stringify({ action: "makeGuess", pokemonId: wrongGuessId }));
    const [hostResult, guestResult] = await Promise.all([hostGameOver, guestGameOver]);

    const expectedRoom = { status: "FINISHED", winner: "player1" };
    expect((hostResult as { room?: unknown }).room).toMatchObject(expectedRoom);
    expect((guestResult as { room?: unknown }).room).toMatchObject(expectedRoom);

    host.close();
    guest.close();
  });

  it("does not let a player submit a second guess", async () => {
    if (!dynamoAvailable) return;

    const { roomCode, host, guest } = await setupActiveGame(wsUrl);
    const room = await getRoom(roomCode);
    const guestSecretId = room!.players.player2!.secretPokemonId;

    const guestSeesRoomUpdate = waitForAction(guest, "roomUpdated");
    host.send(JSON.stringify({ action: "makeGuess", pokemonId: guestSecretId }));
    await guestSeesRoomUpdate;

    await expect(
      new Promise((resolve, reject) => {
        host.once("message", (raw) => {
          const data = JSON.parse(raw.toString()) as { action: string; message?: string };
          if (data.action === "error") reject(new Error(data.message));
          else resolve(data);
        });
        host.send(JSON.stringify({ action: "makeGuess", pokemonId: guestSecretId }));
      }),
    ).rejects.toThrow(/already made your guess/i);

    host.close();
    guest.close();
  });

  it("rejects register with a missing or incorrect playerToken", async () => {
    if (!dynamoAvailable) return;

    const created = await wsOnce<{ roomCode: string }>(
      wsUrl,
      { action: "createRoom", displayName: "Host" },
      (d) => d.action === "roomCreated",
    );

    await expect(
      wsOnce(
        wsUrl,
        { action: "register", roomCode: created.roomCode, displayName: "Host" },
        (d) => d.action === "registered",
      ),
    ).rejects.toThrow(/session token/i);

    await expect(
      wsOnce(
        wsUrl,
        {
          action: "register",
          roomCode: created.roomCode,
          displayName: "Host",
          playerToken: "not-the-real-token",
        },
        (d) => d.action === "registered",
      ),
    ).rejects.toThrow(/session token/i);
  });

  it("forfeitGame ends the match immediately in the opponent's favor", async () => {
    if (!dynamoAvailable) return;

    const { roomCode, host, guest } = await setupActiveGame(wsUrl);

    const hostGameOver = waitForAction(host, "gameOver");
    const guestGameOver = waitForAction(guest, "gameOver");
    guest.send(JSON.stringify({ action: "forfeitGame" }));
    const [hostResult, guestResult] = await Promise.all([hostGameOver, guestGameOver]);

    const expected = { forfeitedBy: "player2", reason: "forfeit" };
    expect(hostResult).toMatchObject(expected);
    expect(guestResult).toMatchObject(expected);

    const room = await getRoom(roomCode);
    expect(room).toMatchObject({ status: "FORFEITED", winner: "player1" });

    host.close();
    guest.close();
  });

  it("leaveRoom gives the player a grace period to rejoin before forfeiting", async () => {
    if (!dynamoAvailable) return;
    env.forfeitGraceMs = 300;

    const { roomCode, host, guest, hostToken } = await setupActiveGame(wsUrl);

    const guestSawDisconnect = waitForAction(guest, "roomUpdated");
    host.send(JSON.stringify({ action: "leaveRoom" }));
    await guestSawDisconnect;

    const rejoinedHost = await openSocket(wsUrl);
    rejoinedHost.send(
      JSON.stringify({
        action: "register",
        roomCode,
        displayName: "Host",
        playerToken: hostToken,
      }),
    );
    await waitForAction(rejoinedHost, "registered");

    // Resolution is lazy (no live timer), so explicitly trigger a check past
    // where the grace period would have expired and confirm reconnecting
    // already cleared it — the game must still be running.
    await new Promise((resolve) => setTimeout(resolve, 350));
    await expect(waitForAction(guest, "gameOver", 500)).rejects.toThrow();
    guest.send(JSON.stringify({ action: "ping" }));
    await expect(waitForAction(guest, "gameOver", 300)).rejects.toThrow();

    const room = await getRoom(roomCode);
    expect(room!.status).toBe("ACTIVE");

    rejoinedHost.close();
    guest.close();
  });

  it("auto-forfeits in the opponent's favor if the player doesn't rejoin in time", async () => {
    if (!dynamoAvailable) return;
    env.forfeitGraceMs = 200;

    const { roomCode, host, guest } = await setupActiveGame(wsUrl);

    const guestSawDisconnect = waitForAction(guest, "roomUpdated");
    host.send(JSON.stringify({ action: "leaveRoom" }));
    await guestSawDisconnect;

    // No live timer resolves this on its own anymore — the remaining client
    // pings periodically, which is what actually triggers the lazy check.
    await new Promise((resolve) => setTimeout(resolve, 250));
    const hostGameOver = waitForAction(guest, "gameOver", 5000);
    guest.send(JSON.stringify({ action: "ping" }));

    const result = await hostGameOver;
    expect(result).toMatchObject({ forfeitedBy: "player1", reason: "disconnect_timeout" });

    const room = await getRoom(roomCode);
    expect(room).toMatchObject({ status: "FORFEITED", winner: "player2" });

    guest.close();
  });
});
