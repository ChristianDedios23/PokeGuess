import { WS_URL } from "./config";

const RESPONSE_ACTIONS: Record<string, string> = {
  createRoom: "roomCreated",
  joinRoom: "joined",
};

export function wsRequest<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const expectedAction = RESPONSE_ACTIONS[action];
    let settled = false;

    const cleanup = () => {
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ action, ...payload }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as { action: string; message?: string };

      if (data.action === "error") {
        finish(() => reject(new Error(data.message ?? "Request failed")));
        return;
      }

      if (expectedAction && data.action === expectedAction) {
        finish(() => resolve(data as T));
      }
    };

    ws.onerror = () => {
      finish(() => reject(new Error("WebSocket connection failed")));
    };

    ws.onclose = () => {
      finish(() => reject(new Error("WebSocket closed before response")));
    };
  });
}
