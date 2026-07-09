import { GameError } from "../src/types/errors";

describe("GameError", () => {
  it("stores status and message", () => {
    const err = new GameError(400, "bad request");
    expect(err.status).toBe(400);
    expect(err.message).toBe("bad request");
    expect(err.name).toBe("GameError");
  });
});
