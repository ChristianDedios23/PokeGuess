"use client";

import { Press_Start_2P } from "next/font/google";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

/** Animata gradient — tweak from / via / to colors here. */
const leaderTextClass =
  "animate-bg-position bg-linear-to-r from-yellow-200 from-10% via-yellow-500 via-50% to-yellow-700 to-90% bg-size-[200%_auto] bg-clip-text text-transparent";

interface ScoreBarProps {
  player1Name: string;
  player2Name: string;
  score1: number;
  score2: number;
  className?: string;
}

export function ScoreBar({
  player1Name,
  player2Name,
  score1,
  score2,
  className = "",
}: ScoreBarProps) {
  const player1Leading = score1 > score2;
  const player2Leading = score2 > score1;

  return (
    <div
      aria-label="Match score"
      className={`${pressStart2P.variable} flex items-center justify-center gap-3 px-2 sm:gap-4 ${className}`}
      style={{ fontFamily: "var(--font-press-start)" }}
    >
      <span
        className={`min-w-0 flex-1 truncate text-right text-xs drop-shadow-sm sm:text-sm md:text-base ${
          player1Leading
            ? leaderTextClass
            : "text-zinc-800 dark:text-zinc-100"
        }`}
      >
        {player1Name}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-lg tabular-nums tracking-wide sm:text-xl md:text-2xl">
        <span
          className={
            player1Leading
              ? leaderTextClass
              : "text-zinc-900 dark:text-zinc-50"
          }
        >
          {score1}
        </span>
        <span className="text-zinc-900 opacity-50 dark:text-zinc-50">–</span>
        <span
          className={
            player2Leading
              ? leaderTextClass
              : "text-zinc-900 dark:text-zinc-50"
          }
        >
          {score2}
        </span>
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-left text-xs drop-shadow-sm sm:text-sm md:text-base ${
          player2Leading
            ? leaderTextClass
            : "text-zinc-800 dark:text-zinc-100"
        }`}
      >
        {player2Name}
      </span>
    </div>
  );
}
