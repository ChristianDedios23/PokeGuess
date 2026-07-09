import type { Response } from "express";
import { getHeartbeat } from "../src/controllers/heartbeat";

describe("heartbeat", () => {
  it("returns status ok", () => {
    const json = jest.fn();
    getHeartbeat({} as never, { json } as unknown as Response);
    expect(json).toHaveBeenCalledWith({ status: "ok" });
  });
});
