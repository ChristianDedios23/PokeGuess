"use client";

import { useEffect, useState } from "react";

interface GameInfoModalProps {
  panel: "rules" | "howToPlay" | null;
  onClose: () => void;
}

export function GameInfoModal({ panel, onClose }: GameInfoModalProps) {
  const [renderedPanel, setRenderedPanel] = useState(panel);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (panel) {
      setRenderedPanel(panel);
      setVisible(false);

      // Let the hidden/no-blur frame paint before starting the opening
      // transition, otherwise mount + visible can be batched into a pop-in.
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
      };
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setRenderedPanel(null), 500);
    return () => window.clearTimeout(timeout);
  }, [panel]);

  useEffect(() => {
    if (!renderedPanel) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [renderedPanel, onClose]);

  if (!renderedPanel) return null;

  const isRules = renderedPanel === "rules";
  const title = isRules ? "Rules" : "How To Play";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-info-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        visible ? "" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()}`}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        style={{
          opacity: visible ? 1 : 0,
          backdropFilter: visible ? "blur(4px)" : "blur(0px)",
          WebkitBackdropFilter: visible ? "blur(4px)" : "blur(0px)",
          transition:
            "opacity 500ms ease-out, backdrop-filter 500ms ease-out, -webkit-backdrop-filter 500ms ease-out",
        }}
      />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-500 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(4px) scale(0.99)",
          transition: "opacity 500ms ease-out, transform 500ms ease-out",
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="game-info-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {isRules ? (
            <p>Placeholder — game rules will go here.</p>
          ) : (
            <>
              <div>
                <strong>Objective:</strong>
                <ul>
                  <li>- Guess your opponent's Pokémon before they guess yours.</li>
                </ul>
              </div>
              <div>
                <strong>Setup:</strong>
                <ul>
                  <li>- Both players receive the same 30 Pokémon to guess from.</li>
                  <li>- Each player receives a random Pokémon their opponent must guess.</li>
                  <li>- Your opponent does not know which Pokémon they are guessing.</li>
                </ul>
              </div>
              <div>
                <strong>Taking Turns:</strong>
                <ul>
                  <li>- Players take turns asking yes/no questions to help narrow down the possible Pokémon.</li>
                  <li>- After a question is asked, the player who asked the question gets to eliminate Pokémon that are not relevant to the answer.</li>
                  <li>- The asking player's turn ends and the other player's turn begins.</li>
                </ul>
              </div>
              <div>
                <strong>Winning:</strong>
                <ul>
                  <li>- Whenever a player has the chance to ask a question, they could instead choose to guess the opponent's Pokémon.</li>
                  <li>- If the guess is correct, the player wins the game, otherwise they immediately lose the game.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
