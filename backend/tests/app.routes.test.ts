import request from "supertest";
import { app } from "../src/app";

describe("app routes", () => {
  it("GET /heartbeat returns ok", async () => {
    const res = await request(app).get("/heartbeat");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
