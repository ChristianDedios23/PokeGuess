import fs from "fs";
import path from "path";
import { randomInt } from "crypto";

// PARTNER NOTE (remove when board selection is implemented):
// Each room should share one board of 30 Pokémon drawn from this cache,
// assign secretPokemonId per player from those 30, and keep board/game
// state in DynamoDB + memory — never call PokéAPI at runtime.

export type PokemonGender = "male" | "female" | "genderless";

export type CachedPokemon = {
  id: number;
  name: string;
  sprite: string;
  spriteFemale: string | null;
  /** -1 genderless, 0 always male, 8 always female, 1–7 female chance in eighths. */
  genderRate: number;
  hasGenderDifferences: boolean;
  types: string[];
  abilities: string[];
};

const dataPath = path.join(__dirname, "..", "..", "data", "pokemon.json");

let pokemonCatalog: CachedPokemon[] | null = null;
let pokemonById: Map<number, CachedPokemon> | null = null;

function ensureLoaded(): CachedPokemon[] {
  if (pokemonCatalog) return pokemonCatalog;

  if (!fs.existsSync(dataPath)) {
    throw new Error(
      `Missing ${dataPath}. Run \`npm run pokemon:build\` in backend/ to generate it.`,
    );
  }

  const parsed = JSON.parse(fs.readFileSync(dataPath, "utf8")) as CachedPokemon[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Invalid Pokémon cache at ${dataPath}`);
  }

  pokemonCatalog = parsed.map(normalizeCachedPokemon);
  pokemonById = new Map(pokemonCatalog.map((entry) => [entry.id, entry]));
  return pokemonCatalog;
}

/** Backfill older cache rows that predate gender fields. */
function normalizeCachedPokemon(entry: CachedPokemon): CachedPokemon {
  return {
    ...entry,
    spriteFemale: entry.spriteFemale ?? null,
    genderRate: typeof entry.genderRate === "number" ? entry.genderRate : -1,
    hasGenderDifferences: Boolean(entry.hasGenderDifferences),
  };
}

/** Full local Pokédex cache. Loaded on first use — no PokéAPI calls. */
export function getAllPokemon(): CachedPokemon[] {
  return ensureLoaded();
}

export function getPokemonById(id: number): CachedPokemon | undefined {
  ensureLoaded();
  return pokemonById?.get(id);
}

/**
 * Roll a gender from species gender_rate (-1 / 0–8).
 * Female chance is genderRate/8 when rate is 1–7.
 */
export function rollGender(genderRate: number): PokemonGender {
  if (genderRate < 0) return "genderless";
  if (genderRate === 0) return "male";
  if (genderRate >= 8) return "female";
  return randomInt(0, 8) < genderRate ? "female" : "male";
}

/** Sprite to show for a rolled gender (falls back to default if no female art). */
export function spriteForGender(pokemon: CachedPokemon, gender: PokemonGender): string {
  if (gender === "female" && pokemon.spriteFemale) return pokemon.spriteFemale;
  return pokemon.sprite;
}
