import { env } from "../src/config/env";
import { dynamoConnectionHelp } from "../src/db/health";

describe("dynamoConnectionHelp", () => {
  it("returns setup instructions for connection refused errors", () => {
    const help = dynamoConnectionHelp(new Error("connect ECONNREFUSED 127.0.0.1:8000"));
    expect(help).toContain(env.dynamodbEndpoint);
    expect(help).toContain("npm run db:up");
    expect(help).toContain("npm run db:setup");
  });

  it("returns the original message for other errors", () => {
    expect(dynamoConnectionHelp(new Error("table missing"))).toBe("table missing");
  });
});
