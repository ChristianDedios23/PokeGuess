import { API_BASE } from "./config";
import type { PokemonGender } from "./game";

export interface PokemonSummary {
  id: number;
  name: string;
  sprite: string;
  spriteFemale: string | null;
  genderRate: number;
  hasGenderDifferences: boolean;
  types: string[];
  abilities: string[];
  /** Height in decimetres, as returned by PokéAPI. */
  height: number;
  /** Weight in hectograms, as returned by PokéAPI. */
  weight: number;
}

let catalogPromise: Promise<Map<number, PokemonSummary>> | null = null;

export function fetchPokemonCatalog(): Promise<Map<number, PokemonSummary>> {
  if (!catalogPromise) {
    catalogPromise = fetch(`${API_BASE}/pokemon`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load Pokémon catalog");
        return res.json() as Promise<{ pokemon: PokemonSummary[] }>;
      })
      .then(({ pokemon }) => new Map(pokemon.map((entry) => [entry.id, normalizePokemon(entry)])))
      .catch((err: unknown) => {
        catalogPromise = null;
        throw err;
      });
  }

  return catalogPromise;
}

function normalizePokemon(entry: PokemonSummary): PokemonSummary {
  return {
    ...entry,
    spriteFemale: entry.spriteFemale ?? null,
    genderRate: typeof entry.genderRate === "number" ? entry.genderRate : -1,
    hasGenderDifferences: Boolean(entry.hasGenderDifferences),
    height: typeof entry.height === "number" ? entry.height : 0,
    weight: typeof entry.weight === "number" ? entry.weight : 0,
  };
}

export function spriteForGender(
  pokemon: PokemonSummary,
  gender: PokemonGender | null | undefined,
): string {
  if (gender === "female" && pokemon.spriteFemale) return pokemon.spriteFemale;
  return pokemon.sprite;
}

export function formatPokemonGender(gender: PokemonGender | null | undefined): string {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  return "Genderless";
}

/**
 * Formats a PokéAPI-style `genderRate` (eighths female, or -1 for
 * genderless species) into a human-readable male/female split, on
 * separate lines, e.g. ["87.5% Male ♂", "12.5% Female ♀"].
 */
export function formatGenderRate(genderRate: number): string[] {
  if (genderRate < 0) return ["Genderless"];
  if (genderRate === 0) return ["100% Male ♂"];
  if (genderRate === 8) return ["100% Female ♀"];

  const femalePercent = (genderRate / 8) * 100;
  const malePercent = 100 - femalePercent;
  const format = (value: number) =>
    Number.isInteger(value) ? value.toString() : value.toFixed(1);

  return [`${format(malePercent)}% Male ♂`, `${format(femalePercent)}% Female ♀`];
}
