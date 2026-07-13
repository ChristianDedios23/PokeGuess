import { verifyDynamoConnection } from "../src/db/health";
import { getRoom, saveRoom } from "../src/db/rooms";
import { isDynamoAvailable, makeTestRoom } from "./helpers/dynamo";

describe("DynamoDB rooms", () => {
  let dynamoAvailable = false;

  beforeAll(async () => {
    dynamoAvailable = await isDynamoAvailable();
    if (!dynamoAvailable) {
      console.warn("Skipping DynamoDB tests — run: npm run db:up && npm run db:setup");
    }
  });

  it("connects and finds the GameRooms table", async () => {
    if (!dynamoAvailable) return;
    await expect(verifyDynamoConnection()).resolves.toBeUndefined();
  });

  it("saves and loads a room", async () => {
    if (!dynamoAvailable) return;

    const room = makeTestRoom("JEST01");
    await saveRoom(room);
    const loaded = await getRoom("JEST01");

    expect(loaded?.roomCode).toBe("JEST01");
    expect(loaded?.status).toBe("WAITING");
  });
});
