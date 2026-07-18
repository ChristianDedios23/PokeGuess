"use client";

import { useEffect, useMemo, useState } from "react";

// PokéGuess-flavored palette: red/white (Pokéball), gold (trophy), and the
// blue/teal already used in the page background gradient — not generic
// rainbow confetti.
const COLORS = ["#ef4444", "#f59e0b", "#14a1ff", "#1efdcd", "#ffffff"];
const PIECE_COUNT = 70;

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  duration: number;
  delay: number;
  drift: number;
  spin: number;
  size: number;
}

function makePieces(): ConfettiPiece[] {
  return Array.from({ length: PIECE_COUNT }, (_, id) => ({
    id,
    left: Math.random() * 100,
    color: COLORS[id % COLORS.length],
    duration: 2.6 + Math.random() * 1.6,
    delay: Math.random() * 0.5,
    drift: (Math.random() - 0.5) * 160,
    spin: 360 + Math.random() * 540 * (Math.random() < 0.5 ? -1 : 1),
    size: 6 + Math.random() * 5,
  }));
}

/** One-shot celebratory burst — mounts, plays, then removes itself. */
export function Confetti() {
  const [visible, setVisible] = useState(true);
  const pieces = useMemo(() => makePieces(), []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      return;
    }
    const timeout = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece absolute top-0 rounded-[2px]"
          style={
            {
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size * 1.6}px`,
              backgroundColor: piece.color,
              animationDuration: `${piece.duration}s`,
              animationDelay: `${piece.delay}s`,
              "--confetti-drift": `${piece.drift}px`,
              "--confetti-spin": `${piece.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
