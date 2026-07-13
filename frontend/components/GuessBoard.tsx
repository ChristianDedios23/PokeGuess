"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { fetchPokemonCatalog, type PokemonSummary } from "@/lib/pokemon";

interface GuessBoardProps {
  roomCode: string;
  selfSlot: "player1" | "player2";
  board: number[];
  ownSecretPokemonId?: number;
  disabled: boolean;
  onGuess: (pokemonId: number) => void;
}

function ruledOutKey(roomCode: string, selfSlot: string): string {
  return `pokeguess_ruled_out_${roomCode.toUpperCase()}_${selfSlot}`;
}

function loadRuledOut(roomCode: string, selfSlot: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(ruledOutKey(roomCode, selfSlot));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveRuledOut(roomCode: string, selfSlot: string, ruledOut: Set<number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ruledOutKey(roomCode, selfSlot), JSON.stringify([...ruledOut]));
}

export function GuessBoard({
  roomCode,
  selfSlot,
  board,
  ownSecretPokemonId,
  disabled,
  onGuess,
}: GuessBoardProps) {
  const [catalog, setCatalog] = useState<Map<number, PokemonSummary> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ruledOut, setRuledOut] = useState<Set<number>>(() => new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPokemonCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load board");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setRuledOut(loadRuledOut(roomCode, selfSlot));
  }, [roomCode, selfSlot]);

  function toggleRuledOut(id: number) {
    if (disabled) return;
    setRuledOut((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveRuledOut(roomCode, selfSlot, next);
      return next;
    });
  }

  function handleSelectForGuess(event: MouseEvent, id: number) {
    event.stopPropagation();
    if (disabled) return;
    setSelected((current) => (current === id ? null : id));
    setConfirming(false);
  }

  function handleGuessClick() {
    if (selected === null) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onGuess(selected);
    setConfirming(false);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Guess board</h2>
          <p className="text-xs text-zinc-500">
            Tap a Pokémon to rule it out. Use &ldquo;Guess&rdquo; when you&apos;re sure.
          </p>
        </div>
        {selected !== null && (
          <button
            type="button"
            onClick={handleGuessClick}
            disabled={disabled}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {confirming ? "Confirm final guess?" : "Submit guess"}
          </button>
        )}
      </div>

      {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}

      {!catalog && !loadError ? (
        <LoadingSpinner label="Loading board..." />
      ) : (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {board.map((id) => {
            const pokemon = catalog?.get(id);
            const isOwn = id === ownSecretPokemonId;
            const isSelected = id === selected;
            const isRuledOut = ruledOut.has(id);

            return (
              <div
                key={id}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => toggleRuledOut(id)}
                onKeyDown={(event) => {
                  if (!disabled && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    toggleRuledOut(id);
                  }
                }}
                aria-pressed={isRuledOut}
                className={`group relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-2 text-center transition hover:border-zinc-300 disabled:cursor-not-allowed dark:hover:border-zinc-700 ${
                  isSelected
                    ? "border-red-600 bg-red-50 dark:bg-red-950/40"
                    : "border-zinc-200 dark:border-zinc-800"
                } ${isRuledOut ? "opacity-40" : ""} ${disabled ? "pointer-events-none opacity-50" : ""}`}
              >
                {pokemon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pokemon.sprite}
                    alt={pokemon.name}
                    className={`h-12 w-12 ${isRuledOut ? "grayscale" : ""}`}
                  />
                ) : (
                  <div className="h-12 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                )}
                {isRuledOut && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl text-red-600/70"
                  >
                    ✕
                  </span>
                )}
                <span
                  className={`truncate text-[11px] capitalize ${isRuledOut ? "line-through" : ""}`}
                >
                  {pokemon?.name ?? id}
                </span>
                {isOwn && (
                  <span className="rounded-full bg-amber-100 px-1.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                    Yours
                  </span>
                )}

                <button
                  type="button"
                  disabled={disabled}
                  onClick={(event) => handleSelectForGuess(event, id)}
                  className={`mt-1 rounded px-1 text-[10px] underline decoration-dotted ${
                    isSelected
                      ? "font-semibold text-red-600 dark:text-red-400"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  }`}
                >
                  {isSelected ? "Selected" : "Guess"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
