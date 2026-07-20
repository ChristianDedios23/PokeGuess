"use client";

import { useEffect, useState, type ReactNode } from "react";

/** "all" means every generation; otherwise a list of selected gen numbers. */
export type GenerationSelection = "all" | number[];
export type LeaveTimerValue = "enable" | "disable";
export type PlayModeValue = "structured" | "freeplay";
export type GuessingRuleValue = "classic" | "final-showdown" | "casual";
export type OpponentInteractValue = "yes" | "no";
export type LimitedTurnsValue = "unlimited" | number;

export interface GameModifiers {
  generation: GenerationSelection;
  leaveTimer: LeaveTimerValue;
  playMode: PlayModeValue;
  guessingRule: GuessingRuleValue;
  opponentInteract: OpponentInteractValue;
  limitedTurns: LimitedTurnsValue;
}

export const DEFAULT_MODIFIERS: GameModifiers = {
  generation: "all",
  leaveTimer: "enable",
  playMode: "freeplay",
  guessingRule: "classic",
  opponentInteract: "no",
  limitedTurns: "unlimited",
};

const GENERATION_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
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

const PLAY_MODE_DESCRIPTIONS: Record<PlayModeValue, string> = {
  structured:
    "The game tracks whose turn it is. You pass the turn manually when you're done, and it becomes your opponent's turn.",
  freeplay:
    "No turn tracking — both players act freely and keep track of everything themselves.",
};

const GUESSING_RULE_DESCRIPTIONS: Record<GuessingRuleValue, string> = {
  classic:
    "Guessing is all-or-nothing: guess wrong and you lose the game immediately.",
  "final-showdown":
    "When a player guesses, it locks in and the other player still gets one guess of their own. Whoever guessed their opponent's Pokémon correctly wins — if both get it right, or both get it wrong, the game ends in a tie.",
  casual:
    "Low stakes: a wrong guess just passes the turn to your opponent instead of ending the game.",
};

function Pill({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
          : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

interface ModifiersModalProps {
  open: boolean;
  value: GameModifiers;
  onChange: (next: GameModifiers) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export function ModifiersModal({
  open,
  value,
  onChange,
  onClose,
  readOnly = false,
}: ModifiersModalProps) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setVisible(false);
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
    const timeout = window.setTimeout(() => setRendered(false), 180);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!rendered) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rendered, onClose]);

  if (!rendered) return null;

  const isStructured = value.playMode === "structured";
  const isAllGens = value.generation === "all";
  const selectedGens = value.generation === "all" ? [] : value.generation;

  function update<K extends keyof GameModifiers>(key: K, next: GameModifiers[K]) {
    if (readOnly) return;
    onChange({ ...value, [key]: next });
  }

  function toggleGeneration(gen: number) {
    if (readOnly) return;
    const current = value.generation === "all" ? [] : [...value.generation];
    const next = current.includes(gen)
      ? current.filter((g) => g !== gen)
      : [...current, gen];

    // Selecting nothing, or selecting every generation, both collapse to "All".
    if (next.length === 0 || next.length === GENERATION_NUMBERS.length) {
      update("generation", "all");
      return;
    }
    update("generation", next.sort((a, b) => a - b));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modifiers-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        visible ? "" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Close modifiers"
        onClick={onClose}
        className="modal-scrim absolute inset-0 bg-black/55 outline-none ring-0 transition-[box-shadow] active:transform-none active:ring-1 active:ring-inset active:ring-white/25 focus-visible:outline-none"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 180ms ease-out",
        }}
      />

      <div
        className="relative z-10 flex max-h-[min(100%,42rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-500 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(4px) scale(0.99)",
          transition: "opacity 180ms ease-out, transform 180ms ease-out",
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div>
            <h2
              id="modifiers-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Modifiers
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Customize how this lobby plays. {readOnly ? "Only the host can change these." : "Changes are permanent to this lobby after starting a game."}
            </p>
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          <Section
            title="Generations"
            description="Pick one or more generations to draw the Pokémon pool from. Choose 'All' to include every generation — selecting it clears the individual picks, and picking every generation flips back to 'All'."
          >
            <div className="flex flex-wrap gap-1.5">
              <Pill
                active={isAllGens}
                onClick={() => update("generation", "all")}
                disabled={readOnly}
              >
                All (Default)
              </Pill>
              {GENERATION_NUMBERS.map((gen) => (
                <Pill
                  key={gen}
                  active={selectedGens.includes(gen)}
                  onClick={() => toggleGeneration(gen)}
                  disabled={readOnly}
                >
                  {GENERATION_ROMAN[gen]}
                </Pill>
              ))}
            </div>
          </Section>

          <Section
            title="Leave Timer"
            description="When enabled, a disconnected player has a grace period to reconnect before auto-forfeiting."
          >
            <div className="flex flex-wrap gap-1.5">
              <Pill
                active={value.leaveTimer === "enable"}
                onClick={() => update("leaveTimer", "enable")}
                disabled={readOnly}
              >
                Enable
              </Pill>
              <Pill
                active={value.leaveTimer === "disable"}
                onClick={() => update("leaveTimer", "disable")}
                disabled={readOnly}
              >
                Disable
              </Pill>
            </div>
          </Section>

          <Section
            title="Play Mode"
            description={PLAY_MODE_DESCRIPTIONS[value.playMode]}
          >
            <div className="flex flex-wrap gap-1.5">
              <Pill
                active={value.playMode === "structured"}
                onClick={() => update("playMode", "structured")}
                disabled={readOnly}
              >
                Structured
              </Pill>
              <Pill
                active={value.playMode === "freeplay"}
                onClick={() => update("playMode", "freeplay")}
                disabled={readOnly}
              >
                Freeplay
              </Pill>
            </div>
          </Section>

          <Section
            title="Guessing Rules"
            description={GUESSING_RULE_DESCRIPTIONS[value.guessingRule]}
          >
            <div className="flex flex-wrap gap-1.5">
              <Pill
                active={value.guessingRule === "classic"}
                onClick={() => update("guessingRule", "classic")}
                disabled={readOnly}
              >
                Classic
              </Pill>
              <Pill
                active={value.guessingRule === "final-showdown"}
                onClick={() => update("guessingRule", "final-showdown")}
                disabled={readOnly}
              >
                Final Showdown
              </Pill>
              <Pill
                active={value.guessingRule === "casual"}
                onClick={() => update("guessingRule", "casual")}
                disabled={readOnly}
              >
                Casual
              </Pill>
            </div>
          </Section>

          {isStructured && (
            <div className="space-y-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
                Structured options
              </p>

              <Section
                title="Limited Turns"
                description="Cap how many turns each player gets, or leave it unlimited."
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Pill
                    active={value.limitedTurns === "unlimited"}
                    onClick={() => update("limitedTurns", "unlimited")}
                    disabled={readOnly}
                  >
                    Unlimited
                  </Pill>
                  <div className="flex min-w-[180px] flex-1 items-center gap-3">
                    <input
                      type="range"
                      min={5}
                      max={20}
                      step={1}
                      value={
                        value.limitedTurns === "unlimited" ? 5 : value.limitedTurns
                      }
                      onChange={(event) =>
                        update("limitedTurns", Number(event.target.value))
                      }
                      disabled={readOnly}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700"
                    />
                    <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
                      {value.limitedTurns === "unlimited"
                        ? "— turns"
                        : `${value.limitedTurns} turns`}
                    </span>
                  </div>
                </div>
              </Section>

              <Section
                title="Allow opponent to interact with their board on your turn?"
                description="When off, your opponent can't cross off or select Pokémon while it's your turn."
              >
                <div className="flex flex-wrap gap-1.5">
                  <Pill
                    active={value.opponentInteract === "yes"}
                    onClick={() => update("opponentInteract", "yes")}
                    disabled={readOnly}
                  >
                    Yes
                  </Pill>
                  <Pill
                    active={value.opponentInteract === "no"}
                    onClick={() => update("opponentInteract", "no")}
                    disabled={readOnly}
                  >
                    No
                  </Pill>
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
