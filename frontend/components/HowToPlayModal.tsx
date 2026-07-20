"use client";

import { useEffect, useState } from "react";
import type { GameModifiers, GuessingRuleValue, PlayModeValue } from "@/lib/game";
import { DEFAULT_MODIFIERS } from "@/lib/game";

interface GameInfoModalProps {
  panel: "rules" | "howToPlay" | null;
  onClose: () => void;
  /** Active lobby modifiers — shown in the Rules panel. */
  modifiers?: GameModifiers;
  hostName?: string;
  guestName?: string;
}

const GENERATION_ROMAN: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
  9: "IX",
};

const PLAY_MODE_LABELS: Record<PlayModeValue, string> = {
  structured: "Structured",
  freeplay: "Freeplay",
};

const PLAY_MODE_DESCRIPTIONS: Record<PlayModeValue, string> = {
  structured:
    "The game tracks whose turn it is. Pass the turn when you're done.",
  freeplay: "No turn tracking — both players act freely.",
};

const GUESSING_RULE_LABELS: Record<GuessingRuleValue, string> = {
  classic: "Classic",
  "final-showdown": "Final Showdown",
  casual: "Casual",
};

const GUESSING_RULE_DESCRIPTIONS: Record<GuessingRuleValue, string> = {
  classic: "Guess wrong and you lose immediately.",
  "final-showdown":
    "When someone guesses, the other player still gets one guess. Correct beats wrong; both right or both wrong is a tie.",
  casual: "A wrong guess doesn't end the game — it just passes the turn.",
};

function formatGenerations(generation: GameModifiers["generation"]): string {
  if (generation === "all") return "All generations";
  return generation.map((gen) => GENERATION_ROMAN[gen] ?? gen).join(", ");
}

function ModifierPill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-green-400 bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:border-green-500 dark:bg-green-950 dark:text-green-200">
      {children}
    </span>
  );
}

function ModifierRow({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="font-semibold text-amber-600 dark:text-amber-400">
          {label}:
        </strong>
        <ModifierPill>{value}</ModifierPill>
      </div>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}

export function GameInfoModal({
  panel,
  onClose,
  modifiers: modifiersProp,
  hostName = "Host",
  guestName = "Guest",
}: GameInfoModalProps) {
  const modifiers = { ...DEFAULT_MODIFIERS, ...modifiersProp };
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
    const timeout = window.setTimeout(() => setRenderedPanel(null), 180);
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
  const title = isRules ? "Game Rules" : "How To Play";
  const isStructured = modifiers.playMode === "structured";

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
        className="modal-scrim absolute inset-0 bg-black/55 outline-none ring-0 transition-[box-shadow] active:transform-none active:ring-1 active:ring-inset active:ring-white/25 focus-visible:outline-none"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 180ms ease-out",
        }}
      />

      <div
        className="relative z-10 flex max-h-[min(100%,42rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-500 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(4px) scale(0.99)",
          transition: "opacity 180ms ease-out, transform 180ms ease-out",
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div>
            <h2
              id="game-info-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </h2>
            {isRules && (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                How this lobby is set up to play.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {isRules ? (
            <>
              <ModifierRow
                label="Generations"
                value={formatGenerations(modifiers.generation)}
                description="Pokémon on the board are drawn from these generations."
              />
              <ModifierRow
                label="Leave Timer"
                value={modifiers.leaveTimer === "enable" ? "Enabled" : "Disabled"}
                description={
                  modifiers.leaveTimer === "enable"
                    ? "A disconnected player has a 30 second grace period to reconnect before auto-forfeiting."
                    : "Disconnecting never auto-forfeits — the player can rejoin anytime."
                }
              />
              <ModifierRow
                label="Play Mode"
                value={PLAY_MODE_LABELS[modifiers.playMode]}
                description={PLAY_MODE_DESCRIPTIONS[modifiers.playMode]}
              />
              <ModifierRow
                label="Guessing Rules"
                value={GUESSING_RULE_LABELS[modifiers.guessingRule]}
                description={GUESSING_RULE_DESCRIPTIONS[modifiers.guessingRule]}
              />
              {isStructured && (
                <>
                  <ModifierRow
                    label="Who Goes First"
                    value={
                      modifiers.firstPlayer === "random"
                        ? "Randomize"
                        : modifiers.firstPlayer === "player1"
                          ? hostName
                          : guestName
                    }
                    description={
                      modifiers.firstPlayer === "random"
                        ? "A player is picked at random when the match starts (and again on rematch)."
                        : modifiers.firstPlayer === "player1"
                          ? `${hostName} opens every match.`
                          : `${guestName} opens every match.`
                    }
                  />
                  <ModifierRow
                    label="Limited Turns"
                    value={
                      modifiers.limitedTurns === "unlimited"
                        ? "Unlimited"
                        : `${modifiers.limitedTurns} per player`
                    }
                    description={
                      modifiers.limitedTurns === "unlimited"
                        ? "No turn cap — play until someone wins."
                        : "When the turn budget runs out, the game ends in a tie."
                    }
                  />
                  <ModifierRow
                    label="Opponent Board Interaction"
                    value={modifiers.opponentInteract === "yes" ? "Allowed" : "Locked"}
                    description={
                      modifiers.opponentInteract === "yes"
                        ? "Your opponent can still cross off Pokémon on their board during your turn."
                        : "Your opponent's board is locked while it's your turn."
                    }
                  />
                </>
              )}
            </>
          ) : (
            <>
              <div>
                <strong className="font-semibold text-amber-600 dark:text-amber-400">
                  Objective:
                </strong>
                <ul>
                  <li>- Guess your opponent&apos;s Pokémon before they guess yours.</li>
                </ul>
              </div>
              <div>
                <strong className="font-semibold text-amber-600 dark:text-amber-400">
                  Setup:
                </strong>
                <ul>
                  <li>- Both players receive the same 30 Pokémon to guess from.</li>
                  <li>- Each player receives a random Pokémon their opponent must guess.</li>
                  <li>- Your opponent does not know which Pokémon they are guessing.</li>
                </ul>
              </div>
              <div>
                <strong className="font-semibold text-amber-600 dark:text-amber-400">
                  Taking Turns:
                </strong>
                <ul>
                  <li>
                    - Players take turns asking yes/no questions to help narrow down the
                    possible Pokémon.
                  </li>
                  <li>
                    - After a question is asked, the player who asked the question gets to
                    eliminate Pokémon that are not relevant to the answer.
                  </li>
                  <li>
                    - The asking player&apos;s turn ends and the other player&apos;s turn
                    begins.
                  </li>
                </ul>
              </div>
              <div>
                <strong className="font-semibold text-amber-600 dark:text-amber-400">
                  Winning:
                </strong>
                <ul>
                  <li>
                    - Whenever a player has the chance to ask a question, they could instead
                    choose to guess the opponent&apos;s Pokémon.
                  </li>
                  <li>
                    - Exact win/lose outcomes depend on this lobby&apos;s Guessing Rules —
                    check Rules for what&apos;s active here.
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
