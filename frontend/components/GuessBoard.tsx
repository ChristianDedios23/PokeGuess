"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Fredoka } from "next/font/google";
import { BoardThemePicker } from "@/components/BoardThemePicker";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BOARD_THEMES } from "@/lib/boardThemes";
import type { PokemonGender } from "@/lib/game";
import { fetchPokemonCatalog, spriteForGender, type PokemonSummary } from "@/lib/pokemon";
import { spriteTransformStyle, useSpriteScale } from "@/lib/useSpriteScale";

const fredoka = Fredoka({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-fredoka",
});

// Overlay regions measured against the 840x710 PC-box frames in
// frontend/public/* Boards/ so the live grid lines up with the painted chrome.
const WALLPAPERS = BOARD_THEMES;

const FRAME_ASPECT = "840 / 710";
const CONTENT_AREA = {
  top: "calc(21.5% + 8px)",
  bottom: "calc(5% - 16px)",
  left: "6%",
  right: "6%",
};
const GRID_COLUMNS = 6;

interface GuessBoardProps {
  roomCode: string;
  selfSlot: "player1" | "player2";
  board: number[];
  boardGenders: PokemonGender[];
  disabled: boolean;
  selected: number | null;
  onSelectForGuess: (pokemonId: number) => void;
  onHoverPokemon?: (pokemonId: number | null, gender: PokemonGender | null) => void;
  themePickerOpen: boolean;
  onThemePickerOpenChange: (open: boolean) => void;
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

function BoardTile({
  id,
  pokemon,
  gender,
  sprite,
  isSelected,
  isRuledOut,
  disabled,
  onToggleRuledOut,
  onHover,
  onSelectForGuess,
}: {
  id: number;
  pokemon: PokemonSummary | undefined;
  gender: PokemonGender;
  sprite: string | null;
  isSelected: boolean;
  isRuledOut: boolean;
  disabled: boolean;
  onToggleRuledOut: (id: number) => void;
  onHover: (id: number | null, gender: PokemonGender | null) => void;
  onSelectForGuess: (event: MouseEvent, id: number) => void;
}) {
  const spriteTransform = useSpriteScale(sprite, id);

  return (
    <div
      className="relative z-0 flex min-h-0 min-w-0 -translate-y-[4px] items-center justify-center hover:z-20 focus-within:z-20"
      style={{ containerType: "size" }}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => onToggleRuledOut(id)}
        onMouseEnter={() => onHover(id, gender)}
        onMouseLeave={() => onHover(null, null)}
        onFocus={() => onHover(id, gender)}
        onBlur={() => onHover(null, null)}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onToggleRuledOut(id);
          }
        }}
        aria-pressed={isRuledOut}
        style={{
          width: "calc(min(100cqw, 100cqh) + 10px)",
          height: "calc(min(100cqw, 100cqh) + 10px)",
        }}
        className={`group relative flex origin-center items-center justify-center rounded-full bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.25)] ring-1 ring-black/10 backdrop-blur-[1px] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-safe:hover:-translate-y-1 motion-safe:hover:scale-110 motion-safe:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_10px_rgba(0,0,0,0.3)] motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-zinc-800/85 ${
          isSelected ? "pcbox-selected ring-4 ring-amber-400" : ""
        } ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
      >
        {sprite ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sprite}
            alt={pokemon?.name ?? String(id)}
            draggable={false}
            style={spriteTransformStyle(spriteTransform)}
            className={`pointer-events-none block size-[calc(70%+4px)] shrink-0 object-contain object-center transition-[filter,opacity,transform] duration-300 ${
              isRuledOut ? "opacity-45 grayscale" : ""
            }`}
          />
        ) : (
          <div
            className={`size-[calc(60%+4px)] shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700 ${
              isRuledOut ? "opacity-45 grayscale" : ""
            }`}
          />
        )}

        {isRuledOut && (
          <span
            aria-hidden="true"
            className="pcbox-sticker pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-black leading-none text-red-600 drop-shadow-[0_1px_0_rgba(127,29,29,0.45)]"
          >
            ✕
          </span>
        )}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 rounded-md bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap text-white capitalize opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:bg-zinc-100/90 dark:text-zinc-900"
        >
          {pokemon?.name ?? id}
        </span>
      </div>

      {/*
        Stationary sizer that mirrors the circle's exact footprint above,
        but without its hover scale/translate animation. The guess button
        lives in here instead of inside the animated circle so its hitbox
        never drifts out from under the cursor mid-hover (which made
        clicks near the edges/corners of the button unreliable).
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "calc(min(100cqw, 100cqh) + 10px)",
          height: "calc(min(100cqw, 100cqh) + 10px)",
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={(event) => onSelectForGuess(event, id)}
          aria-label={isSelected ? `${pokemon?.name ?? id} selected` : `Guess ${pokemon?.name ?? id}`}
          className="group/guess pointer-events-auto absolute -right-1.5 -bottom-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full"
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full border shadow-sm transition-transform duration-150 group-hover/guess:scale-110 sm:h-5 sm:w-5 ${
              isSelected
                ? "border-amber-500 bg-amber-400 text-amber-950"
                : "border-black/10 bg-white text-zinc-400 group-hover/guess:text-red-500 dark:border-white/10 dark:bg-zinc-700 dark:text-zinc-400"
            }`}
          >
            <span className="block h-1.5 w-1.5 rounded-full bg-current sm:h-2 sm:w-2" />
          </span>
        </button>
      </div>
    </div>
  );
}

export function GuessBoard({
  roomCode,
  selfSlot,
  board,
  boardGenders,
  disabled,
  selected,
  onSelectForGuess,
  onHoverPokemon,
  themePickerOpen,
  onThemePickerOpenChange,
}: GuessBoardProps) {
  const [catalog, setCatalog] = useState<Map<number, PokemonSummary> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ruledOut, setRuledOut] = useState<Set<number>>(() => new Set());
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

  const closeThemePicker = useCallback(() => onThemePickerOpenChange(false), [onThemePickerOpenChange]);

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
    onSelectForGuess(id);
  }

  function selectWallpaper(index: number) {
    setWallpaperIndex(index);
    saveWallpaperIndex(roomCode, selfSlot, index);
  }

  const wallpaper = WALLPAPERS[wallpaperIndex];
  const gridRows = Math.ceil(board.length / GRID_COLUMNS);

  return (
    <section className={`${fredoka.variable} relative flex h-full min-h-0 w-full flex-col`}>
      {loadError && (
        <p className="shrink-0 text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}

      <div className="relative min-h-0 w-full flex-1" style={{ containerType: "size" }}>
        <BoardThemePicker
          open={themePickerOpen}
          selectedId={wallpaper.id}
          themes={WALLPAPERS}
          onClose={closeThemePicker}
          onSelect={selectWallpaper}
        />

        <div
          className="absolute bottom-0 left-1/2 max-h-full max-w-full -translate-x-1/2 select-none ring-2 ring-zinc-300/80 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] dark:ring-zinc-700/70"
          style={{
            aspectRatio: FRAME_ASPECT,
            width: "min(100cqw, calc(100cqh * 840 / 710))",
            height: "min(100cqh, calc(100cqw * 710 / 840))",
          }}
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

            {/* Slot grid, overlaid on the picture area of the frame */}
            <div className="absolute" style={CONTENT_AREA}>
              {!catalog && !loadError ? (
                <div className="flex h-full w-full items-center justify-center">
                  <LoadingSpinner label="Loading board..." />
                </div>
              ) : (
                <div
                  className="grid h-full w-full gap-x-[calc(1.5%+2px)] gap-y-[calc(1.5%+14px)]"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
                  }}
                >
                  {board.map((id, index) => {
                    const pokemon = catalog?.get(id);
                    const gender = boardGenders[index] ?? "genderless";
                    const sprite = pokemon ? spriteForGender(pokemon, gender) : null;

                    return (
                      <BoardTile
                        key={`${id}-${index}`}
                        id={id}
                        pokemon={pokemon}
                        gender={gender}
                        sprite={sprite}
                        isSelected={id === selected}
                        isRuledOut={ruledOut.has(id)}
                        disabled={disabled}
                        onToggleRuledOut={toggleRuledOut}
                        onHover={(hoveredId, hoveredGender) =>
                          onHoverPokemon?.(hoveredId, hoveredGender)
                        }
                        onSelectForGuess={handleSelectForGuess}
                      />
                    );
                  })}
                </div>
              )}
            </div>
        </div>
      </div>
    </section>
  );
}
