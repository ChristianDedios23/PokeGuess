import WebSocket from "ws";

const WS_URL = "ws://localhost:3000/ws";

async function once(send: object, match: (d: { action: string }) => boolean) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.on("open", () => ws.send(JSON.stringify(send)));
    ws.on("message", (raw) => {
      const d = JSON.parse(raw.toString());
      console.log("once:", d.action, d.message ?? "");
      if (d.action === "error") {
        ws.close();
        reject(new Error(d.message));
      } else if (match(d)) {
        ws.close();
        resolve(d);
      }
    });
  });
}

async function main() {
  const created = (await once(
    { action: "createRoom", displayName: "Host" },
    (d) => d.action === "roomCreated",
  )) as { roomCode: string };
  const roomCode = created.roomCode;

  await once(
    { action: "joinRoom", roomCode, displayName: "Guest" },
    (d) => d.action === "joined",
  );

  const host = new WebSocket(WS_URL);
  await new Promise<void>((r) => host.on("open", () => r()));
  host.on("message", (raw) => {
    const d = JSON.parse(raw.toString());
    console.log("host:", d.action, d.message ?? "", JSON.stringify(d.room?.players));
  });
  host.send(JSON.stringify({ action: "register", roomCode, displayName: "Host" }));
  await new Promise((r) => setTimeout(r, 200));

  const guest = new WebSocket(WS_URL);
  await new Promise<void>((r) => guest.on("open", () => r()));
  guest.on("message", (raw) => {
    const d = JSON.parse(raw.toString());
    console.log("guest:", d.action, d.message ?? "", JSON.stringify(d.room?.players));
  });
  guest.send(JSON.stringify({ action: "register", roomCode, displayName: "Guest" }));
  await new Promise((r) => setTimeout(r, 200));

  console.log("sending readyUp host");
  host.send(JSON.stringify({ action: "readyUp" }));
  await new Promise((r) => setTimeout(r, 500));
  console.log("sending readyUp guest");
  guest.send(JSON.stringify({ action: "readyUp" }));
  await new Promise((r) => setTimeout(r, 500));

  host.close();
  guest.close();
}

main().catch(console.error);
