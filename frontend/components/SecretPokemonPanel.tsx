"use client";

import { useEffect, useState } from "react";
import type { PokemonGender } from "@/lib/game";
import {
  fetchPokemonCatalog,
  formatGenderRate,
  formatPokemonGender,
  spriteForGender,
  type PokemonSummary,
} from "@/lib/pokemon";
import { formatGeneration } from "@/lib/pokemonGenerations";
import { pokemonTypeIconSrc } from "@/lib/pokemonTypes";
import { formatHeight, formatWeight } from "@/lib/pokemonUnits";
import { spriteTransformStyle, useSpriteScale } from "@/lib/useSpriteScale";

interface SecretPokemonPanelProps {
  pokemonId?: number;
  secretGender?: PokemonGender;
  hoveredPokemonId?: number | null;
  hoveredGender?: PokemonGender | null;
  className?: string;
  variant?: "full" | "inspectView";
}

function usePokemonCatalog() {
  const [catalog, setCatalog] = useState<Map<number, PokemonSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPokemonCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Pokémon");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, error };
}

export function YourPokemonCard({
  pokemonId,
  secretGender = "genderless",
  className = "",
  onHover,
}: {
  pokemonId?: number;
  secretGender?: PokemonGender;
  className?: string;
  onHover?: (hovering: boolean) => void;
}) {
  const { catalog, error } = usePokemonCatalog();

  const ownPokemon = pokemonId !== undefined ? (catalog?.get(pokemonId) ?? null) : null;

  return (
    <section
      aria-label="Your secret Pokémon"
      className={`mx-auto flex w-fit items-center gap-3 overflow-hidden rounded-xl border border-zinc-200 bg-white py-2 pr-2.5 pl-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        Your
        <br />
        Pokémon
      </h2>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <PokemonCircle
          pokemon={ownPokemon}
          gender={secretGender}
          sizeClass="size-12"
          ringClass="ring-2 ring-amber-400"
          onMouseEnter={() => onHover?.(true)}
          onMouseLeave={() => onHover?.(false)}
        />
      )}
    </section>
  );
}

function PokemonCircle({
  pokemon,
  gender,
  sizeClass = "size-24 sm:size-28",
  ringClass = "ring-2 ring-amber-400",
  onMouseEnter,
  onMouseLeave,
}: {
  pokemon: PokemonSummary | null;
  gender?: PokemonGender | null;
  sizeClass?: string;
  ringClass?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const sprite = pokemon ? spriteForGender(pokemon, gender) : null;
  const spriteTransform = useSpriteScale(sprite, pokemon?.id);

  const content = sprite ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sprite}
      alt={pokemon?.name}
      draggable={false}
      style={spriteTransformStyle(spriteTransform)}
      className="size-[80%] object-contain"
    />
  ) : (
    <div className="size-[55%] animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
  );

  const sharedClass = `flex items-center justify-center overflow-hidden rounded-full bg-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(0,0,0,0.12)] dark:bg-zinc-800 ${sizeClass} ${ringClass}`;

  return (
    <div className={sharedClass} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {content}
    </div>
  );
}

export function SecretPokemonPanel({
  pokemonId,
  secretGender = "genderless",
  hoveredPokemonId = null,
  hoveredGender = null,
  className = "",
  variant = "full",
}: SecretPokemonPanelProps) {
  const { catalog } = usePokemonCatalog();

  const inspectId = hoveredPokemonId ?? undefined;
  const inspectGender = hoveredGender;
  const inspectedPokemon =
    inspectId !== undefined ? (catalog?.get(inspectId) ?? null) : null;
  const detailSprite = inspectedPokemon
    ? spriteForGender(inspectedPokemon, inspectGender)
    : null;
  const detailSpriteTransform = useSpriteScale(detailSprite, inspectedPokemon?.id);

  const rootRows =
    variant === "inspectView"
      ? "grid-rows-[minmax(0,1fr)_minmax(0,1fr)]"
      : "grid-rows-[auto_auto_minmax(0,1fr)]";

  return (
    <aside
      aria-label="Pokémon info"
      className={`grid min-h-0 gap-3 ${rootRows} ${className}`}
    >
      {variant === "full" && (
        <YourPokemonCard pokemonId={pokemonId} secretGender={secretGender} />
      )}

      <section
        aria-label="Inspected Pokémon"
        className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="shrink-0 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Inspect
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {inspectedPokemon ? (
            <>
              <div>
                <p className="truncate text-sm font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                  {inspectedPokemon.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  #{String(inspectedPokemon.id).padStart(3, "0")} ·{" "}
                  {formatGeneration(inspectedPokemon.id)}
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                  Gender
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {formatPokemonGender(inspectGender)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                    Height
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {formatHeight(inspectedPokemon.height)}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                    Weight
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {formatWeight(inspectedPokemon.weight)}
                  </p>
                </div>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                  Types
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {inspectedPokemon.types.map((type) => {
                    const iconSrc = pokemonTypeIconSrc(type);
                    return (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {iconSrc && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={iconSrc}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="size-3.5 shrink-0 object-contain"
                          />
                        )}
                        {type}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                    Abilities
                  </p>
                  <ul className="space-y-0.5">
                    {inspectedPokemon.abilities.map((ability) => (
                      <li
                        key={ability}
                        className="text-sm capitalize text-zinc-700 dark:text-zinc-300"
                      >
                        {ability.replace(/-/g, " ")}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                    Gender Probability
                  </p>
                  {formatGenderRate(inspectedPokemon.genderRate).map((line) => (
                    <p
                      key={line}
                      className="text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Hover a Pokémon to inspect it
            </p>
          )}
        </div>
      </section>

      <section
        aria-label="Pokémon detail"
        className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="shrink-0 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            View
          </h2>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center p-3">
          {detailSprite && inspectedPokemon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${inspectedPokemon.id}-${inspectGender}`}
              src={detailSprite}
              alt={inspectedPokemon.name}
              draggable={false}
              style={spriteTransformStyle(detailSpriteTransform)}
              className="h-[90%] w-[90%] object-contain drop-shadow-sm"
            />
          ) : (
            <div className="flex size-full min-h-24 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600">
              <span className="text-2xl text-zinc-300 dark:text-zinc-600">?</span>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
