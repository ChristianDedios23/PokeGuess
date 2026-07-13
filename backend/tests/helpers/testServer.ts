import { createServer, type Server } from "http";
import type { AddressInfo } from "node:net";
import { setupWebSocketServer } from "../../src/ws/server";

export async function startWsTestServer(): Promise<{ server: Server; wsUrl: string }> {
  const server = createServer();
  setupWebSocketServer(server);

  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const address = server.address() as AddressInfo;
  return { server, wsUrl: `ws://127.0.0.1:${address.port}/ws` };
}

export async function stopWsTestServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
