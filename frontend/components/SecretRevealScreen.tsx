"use client";

import { useEffect, useMemo, useState } from "react";
import { Fredoka } from "next/font/google";
import type { PokemonGender } from "@/lib/game";
import { fetchPokemonCatalog, spriteForGender, type PokemonSummary } from "@/lib/pokemon";

const fredoka = Fredoka({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-reveal-fredoka",
});

const INTRO_TEXT = "Your secret Pokémon is…";
const LETTER_STEP_MS = 40;
const LETTER_BASE_DELAY_MS = 250;
const LETTER_DURATION_MS = 550;
const REVEAL_GAP_MS = 200;
const REVEAL_DURATION_MS = 650;
const HINT_GAP_MS = 350;
const HOLD_MS = 1920;
const FADE_MS = 550;

interface SecretRevealScreenProps {
  pokemonId?: number;
  gender?: PokemonGender;
  onDone: () => void;
}

export function SecretRevealScreen({
  pokemonId,
  gender = "genderless",
  onDone,
}: SecretRevealScreenProps) {
  const [catalog, setCatalog] = useState<Map<number, PokemonSummary> | null>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPokemonCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        // Sprite/name simply stay blank if the catalog fails to load here;
        // the rest of the UI will still surface the error elsewhere.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const letters = useMemo(() => INTRO_TEXT.split(""), []);

  const textEndMs =
    LETTER_BASE_DELAY_MS + Math.max(letters.length - 1, 0) * LETTER_STEP_MS + LETTER_DURATION_MS;
  const revealStartMs = textEndMs + REVEAL_GAP_MS;
  const revealEndMs = revealStartMs + REVEAL_DURATION_MS;
  const hintStartMs = revealEndMs + HINT_GAP_MS;
  const totalHoldMs = revealEndMs + HOLD_MS;

  useEffect(() => {
    const hintTimer = setTimeout(() => setShowHint(true), hintStartMs);
    const fadeTimer = setTimeout(() => setFadingOut(true), totalHoldMs);
    const doneTimer = setTimeout(() => onDone(), totalHoldMs + FADE_MS);
    return () => {
      clearTimeout(hintTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
    // Timing is derived once from constants; onDone is stable from the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintStartMs, totalHoldMs]);

  function handleSkip() {
    if (fadingOut) return;
    setFadingOut(true);
    setTimeout(onDone, FADE_MS);
  }

  const pokemon = pokemonId !== undefined ? (catalog?.get(pokemonId) ?? null) : null;
  const sprite = pokemon ? spriteForGender(pokemon, gender) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSkip}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSkip();
        }
      }}
      aria-label="Secret Pokémon reveal, tap to continue"
      className={`${fredoka.variable} fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-6 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-6 text-center transition-opacity duration-500 ${
        fadingOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <h1
        aria-live="polite"
        className="overflow-hidden px-2 py-1 text-2xl font-semibold text-zinc-100 sm:text-3xl"
        style={{ fontFamily: "var(--font-reveal-fredoka)" }}
      >
        {letters.map((char, index) => (
          <span
            key={`${char}-${index}`}
            className="reveal-letter inline-block"
            style={{
              animationDelay: `${LETTER_BASE_DELAY_MS + index * LETTER_STEP_MS}ms`,
              animationDuration: `${LETTER_DURATION_MS}ms`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </h1>

      <div
        className="slide-reveal flex flex-col items-center gap-3"
        style={{
          animationDelay: `${revealStartMs}ms`,
          animationDuration: `${REVEAL_DURATION_MS}ms`,
        }}
      >
        <div className="flex size-40 items-center justify-center overflow-hidden rounded-full bg-white/10 shadow-[0_0_0_6px_rgba(245,158,11,0.35),0_20px_45px_rgba(0,0,0,0.45)] ring-2 ring-amber-400 sm:size-48">
          {sprite ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sprite}
              alt={pokemon?.name ?? ""}
              draggable={false}
              className="size-[80%] object-contain drop-shadow-lg"
            />
          ) : (
            <div className="size-[55%] animate-pulse rounded-full bg-white/20" />
          )}
        </div>
        <p
          className="truncate text-2xl font-bold capitalize text-white sm:text-3xl"
          style={{ fontFamily: "var(--font-reveal-fredoka)" }}
        >
          {pokemon?.name ?? ""}
        </p>
      </div>

      <p
        className={`text-xs font-medium tracking-wide text-zinc-500 uppercase transition-opacity duration-500 ${
          showHint ? "opacity-70" : "opacity-0"
        }`}
      >
        Click to skip
      </p>
    </div>
  );
}
