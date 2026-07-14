"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Fredoka } from "next/font/google";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BOARD_THEMES } from "@/lib/boardThemes";
import { fetchPokemonCatalog, type PokemonSummary } from "@/lib/pokemon";

const fredoka = Fredoka({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-fredoka",
});

// The overlay positions below were measured pixel-by-pixel against the board
// art in frontend/public/board{1,2,3}.png so the live grid and controls line
// up with the painted chrome (bezel, nav arrows, title bar, wallpaper).
const WALLPAPERS = BOARD_THEMES;

const FRAME_ASPECT = "176 / 165";
const NAV_ARROW = { top: "5%", height: "14%", width: "9%" };
const NAV_LEFT_ARROW = { ...NAV_ARROW, left: "4.5%" };
const NAV_RIGHT_ARROW = { ...NAV_ARROW, left: "85.8%" };
const NAV_TITLE = { top: "5%", height: "14%", left: "17%", width: "65%" };
const CONTENT_AREA = { top: "24%", bottom: "8%", left: "7%", right: "7%" };
const GRID_COLUMNS = 6;

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

function wallpaperKey(roomCode: string, selfSlot: string): string {
  return `pokeguess_wallpaper_${roomCode.toUpperCase()}_${selfSlot}`;
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

function loadWallpaperIndex(roomCode: string, selfSlot: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(wallpaperKey(roomCode, selfSlot));
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) && parsed >= 0 && parsed < WALLPAPERS.length ? parsed : 0;
}

function saveWallpaperIndex(roomCode: string, selfSlot: string, index: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(wallpaperKey(roomCode, selfSlot), String(index));
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
  const [wallpaperIndex, setWallpaperIndex] = useState(0);

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
    setWallpaperIndex(loadWallpaperIndex(roomCode, selfSlot));
  }, [roomCode, selfSlot]);

  // Tint the whole page to match the selected board, restoring the default
  // background once the board is no longer on screen.
  useEffect(() => {
    const theme = WALLPAPERS[wallpaperIndex];
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyBackground = (isDark: boolean) => {
      root.style.setProperty(
        "--background",
        isDark ? theme.pageBackground.dark : theme.pageBackground.light,
      );
    };

    applyBackground(media.matches);
    const handleChange = (event: MediaQueryListEvent) => applyBackground(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [wallpaperIndex]);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty("--background");
    };
  }, []);

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

  function cycleWallpaper(delta: number) {
    setWallpaperIndex((current) => {
      const next = (current + delta + WALLPAPERS.length) % WALLPAPERS.length;
      saveWallpaperIndex(roomCode, selfSlot, next);
      return next;
    });
  }

  const wallpaper = WALLPAPERS[wallpaperIndex];
  const gridRows = Math.ceil(board.length / GRID_COLUMNS);

  return (
    <section className={`${fredoka.variable} space-y-3`}>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Tap a Pokémon to rule it out. Use the target badge to line up your final &ldquo;Guess&rdquo;.
      </p>

      {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}

      <div
        className="relative w-full select-none"
        style={{ aspectRatio: FRAME_ASPECT }}
      >
        {/* Board frame art (bezel, nav chrome and wallpaper baked in) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={wallpaper.id}
          src={wallpaper.file}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pcbox-fade absolute inset-0 h-full w-full"
        />

        {/* Previous board */}
        <button
          type="button"
          onClick={() => cycleWallpaper(-1)}
          aria-label="Previous board"
          className="group absolute rounded-xl transition active:scale-90"
          style={NAV_LEFT_ARROW}
        >
          <span className="absolute inset-0 rounded-xl bg-white/0 transition group-hover:bg-white/30" />
        </button>

        {/* Next board */}
        <button
          type="button"
          onClick={() => cycleWallpaper(1)}
          aria-label="Next board"
          className="group absolute rounded-xl transition active:scale-90"
          style={NAV_RIGHT_ARROW}
        >
          <span className="absolute inset-0 rounded-xl bg-white/0 transition group-hover:bg-white/30" />
        </button>

        {/* Title bar label, sitting inside the painted pill */}
        <div
          className="pointer-events-none absolute flex items-center justify-center"
          style={NAV_TITLE}
        >
          <span
            style={{ fontFamily: "var(--font-fredoka)", color: wallpaper.accent }}
            className="truncate text-[11px] font-bold drop-shadow-[0_1px_0_rgba(255,255,255,0.7)] sm:text-sm"
          >
            {wallpaper.label}
            <span className="ml-1.5 text-[9px] font-semibold opacity-70 sm:text-xs">
              {wallpaperIndex + 1}/{WALLPAPERS.length}
            </span>
          </span>
        </div>

        {/* Slot grid, overlaid on the picture area of the frame */}
        <div className="absolute" style={CONTENT_AREA}>
          {!catalog && !loadError ? (
            <div className="flex h-full w-full items-center justify-center">
              <LoadingSpinner label="Loading board..." />
            </div>
          ) : (
            <div
              className="grid h-full w-full gap-[3%]"
              style={{
                gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
              }}
            >
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
                    className={`group relative flex aspect-square items-center justify-center rounded-full bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.25)] ring-1 ring-black/10 backdrop-blur-[1px] transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-110 motion-safe:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_10px_rgba(0,0,0,0.3)] motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-zinc-800/85 ${
                      isSelected ? "pcbox-selected ring-2 ring-amber-400" : ""
                    } ${isRuledOut ? "opacity-45 grayscale" : ""} ${
                      disabled ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }`}
                  >
                    {isOwn && (
                      <span
                        style={{ fontFamily: "var(--font-fredoka)" }}
                        className="absolute -top-1 -left-1 z-10 rounded-full bg-amber-400 px-1 text-[7px] font-bold text-amber-950 shadow-sm sm:text-[8px]"
                      >
                        You
                      </span>
                    )}

                    {pokemon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pokemon.sprite}
                        alt={pokemon.name}
                        className="h-[70%] w-[70%] transition-transform duration-200 motion-safe:group-hover:scale-110"
                      />
                    ) : (
                      <div className="h-[60%] w-[60%] animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    )}

                    {isRuledOut && (
                      <span
                        aria-hidden="true"
                        className="pcbox-sticker pointer-events-none absolute inset-0 flex items-center justify-center text-xl text-red-600/70"
                      >
                        ✕
                      </span>
                    )}

                    {/* Hover-revealed name tooltip */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 rounded-md bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap text-white capitalize opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:bg-zinc-100/90 dark:text-zinc-900"
                    >
                      {pokemon?.name ?? id}
                    </span>

                    {/* Corner toggle to arm this Pokémon as the final guess */}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(event) => handleSelectForGuess(event, id)}
                      aria-label={isSelected ? `${pokemon?.name ?? id} selected` : `Guess ${pokemon?.name ?? id}`}
                      className={`absolute -right-1 -bottom-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border shadow-sm transition-transform duration-150 hover:scale-125 sm:h-5 sm:w-5 ${
                        isSelected
                          ? "border-amber-500 bg-amber-400 text-amber-950"
                          : "border-black/10 bg-white text-zinc-400 hover:text-red-500 dark:border-white/10 dark:bg-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      <span className="block h-1.5 w-1.5 rounded-full bg-current sm:h-2 sm:w-2" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selected !== null && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGuessClick}
            disabled={disabled}
            style={{ fontFamily: "var(--font-fredoka)" }}
            className="shrink-0 rounded-full bg-gradient-to-b from-red-500 to-red-600 px-4 py-2 text-xs font-bold text-white shadow-[0_3px_0_0_rgba(153,27,27,1),0_6px_10px_-2px_rgba(0,0,0,0.3)] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(153,27,27,1)] disabled:opacity-50"
          >
            {confirming ? "Confirm final guess?" : "Submit guess"}
          </button>
        </div>
      )}
    </section>
  );
}
