import { normalizeDisplayName } from "../src/services/roomService";
import { GameError } from "../src/types/errors";

describe("normalizeDisplayName", () => {
  it("trims and accepts valid names", () => {
    expect(normalizeDisplayName("  Ash  ")).toBe("Ash");
  });

  it("rejects empty names", () => {
    expect(() => normalizeDisplayName("   ")).toThrow(GameError);
  });

  it("rejects names over 24 characters", () => {
    expect(() => normalizeDisplayName("a".repeat(25))).toThrow(GameError);
  });
});
