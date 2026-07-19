import type { HandlerContext } from "../handlers/types";

const WS_RATE_LIMIT = 25;
const WS_RATE_WINDOW_MS = 10_000;

const windows = new WeakMap<HandlerContext, { count: number; windowStart: number }>();

/** Fixed-window per-connection message limiter. Entries are GC'd with their HandlerContext on disconnect. */
export function checkRateLimit(ctx: HandlerContext): boolean {
  const now = Date.now();
  const entry = windows.get(ctx);

  if (!entry || now - entry.windowStart > WS_RATE_WINDOW_MS) {
    windows.set(ctx, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= WS_RATE_LIMIT;
}
