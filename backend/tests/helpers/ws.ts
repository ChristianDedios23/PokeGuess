import WebSocket from "ws";

export function wsOnce<T>(
  wsUrl: string,
  send: object,
  match: (data: { action: string }) => boolean,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      ws.close();
      fn();
    };

    ws.on("open", () => ws.send(JSON.stringify(send)));
    ws.on("message", (raw) => {
      const data = JSON.parse(raw.toString()) as { action: string; message?: string };
      if (data.action === "error") {
        finish(() => reject(new Error(data.message ?? "error")));
        return;
      }
      if (match(data)) {
        finish(() => resolve(data as T));
      }
    });
    ws.on("error", () => finish(() => reject(new Error("connection failed"))));
    ws.on("close", () => finish(() => reject(new Error("closed early"))));
  });
}

export function openSocket(wsUrl: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on("open", () => resolve(ws));
    ws.on("error", () => reject(new Error("connection failed")));
  });
}

export function waitForAction(
  ws: WebSocket,
  action: string,
  timeoutMs = 5000,
): Promise<{ action: string; [key: string]: unknown }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`timeout waiting for ${action}`)), timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      const data = JSON.parse(raw.toString()) as { action: string; message?: string };
      if (data.action === "error") {
        clearTimeout(timeout);
        ws.off("message", onMessage);
        reject(new Error(data.message ?? "error"));
        return;
      }
      if (data.action === action) {
        clearTimeout(timeout);
        ws.off("message", onMessage);
        resolve(data);
      }
    };

    ws.on("message", onMessage);
  });
}

export function waitForBothReady(sockets: WebSocket[], timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("ready timeout")), timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      const data = JSON.parse(raw.toString()) as {
        action: string;
        room?: { players: { player1?: { ready: boolean }; player2?: { ready: boolean } } };
      };
      if (data.action !== "roomUpdated" || !data.room) return;
      if (data.room.players.player1?.ready && data.room.players.player2?.ready) {
        clearTimeout(timeout);
        for (const ws of sockets) ws.off("message", onMessage);
        resolve();
      }
    };

    for (const ws of sockets) ws.on("message", onMessage);
  });
}
