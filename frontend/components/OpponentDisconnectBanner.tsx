"use client";

import { useEffect, useState } from "react";

interface OpponentDisconnectBannerProps {
  opponentName: string;
  disconnectedAt: string;
  graceMs: number;
}

/**
 * Ticks down independently of the rest of the room state so a 1s interval
 * doesn't force the whole (heavier) game board to re-render.
 */
export function OpponentDisconnectBanner({
  opponentName,
  disconnectedAt,
  graceMs,
}: OpponentDisconnectBannerProps) {
  const deadline = new Date(disconnectedAt).getTime() + graceMs;
  const [remainingMs, setRemainingMs] = useState(() => deadline - Date.now());

  useEffect(() => {
    setRemainingMs(deadline - Date.now());
    const interval = setInterval(() => setRemainingMs(deadline - Date.now()), 250);
    return () => clearInterval(interval);
  }, [deadline]);

  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const clock = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500"
      />
      {secondsLeft > 0 ? (
        <>
          <span className="font-medium">{opponentName} has left the game.</span>
          <span>
            They have{" "}
            <span className="font-mono font-semibold tabular-nums">{clock}</span> to rejoin
            before you win by forfeit.
          </span>
        </>
      ) : (
        <span className="font-medium">
          {opponentName} didn&apos;t reconnect in time — wrapping up the match…
        </span>
      )}
    </p>
  );
}
