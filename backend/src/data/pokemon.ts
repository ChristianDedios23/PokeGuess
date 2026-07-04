import fs from "fs";
import path from "path";

// PARTNER NOTE (remove when board selection is implemented):
// Each room should share one board of 30 Pokémon drawn from this cache,
// assign secretPokemonId per player from those 30, and keep board/game
// state in DynamoDB + memory — never call PokéAPI at runtime.

export type CachedPokemon = {
  id: number;
  name: string;
  sprite: string;
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

  pokemonCatalog = parsed;
  pokemonById = new Map(parsed.map((entry) => [entry.id, entry]));
  return pokemonCatalog;
}

/** Full local Pokédex cache. Loaded on first use — no PokéAPI calls. */
export function getAllPokemon(): CachedPokemon[] {
  return ensureLoaded();
}

export function getPokemonById(id: number): CachedPokemon | undefined {
  ensureLoaded();
  return pokemonById?.get(id);
}
