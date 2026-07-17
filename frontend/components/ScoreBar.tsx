"use client";

import { Press_Start_2P } from "next/font/google";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

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
  return (
    <div
      aria-label="Match score"
      className={`${pressStart2P.variable} flex items-center justify-center gap-3 px-2 sm:gap-4 ${className}`}
      style={{ fontFamily: "var(--font-press-start)" }}
    >
      <span className="min-w-0 flex-1 truncate text-right text-xs text-zinc-800 drop-shadow-sm sm:text-sm md:text-base dark:text-zinc-100">
        {player1Name}
      </span>
      <span className="shrink-0 text-lg tabular-nums tracking-wide text-zinc-900 sm:text-xl md:text-2xl dark:text-zinc-50">
        {score1} <span className="opacity-50">–</span> {score2}
      </span>
      <span className="min-w-0 flex-1 truncate text-left text-xs text-zinc-800 drop-shadow-sm sm:text-sm md:text-base dark:text-zinc-100">
        {player2Name}
      </span>
    </div>
  );
}
