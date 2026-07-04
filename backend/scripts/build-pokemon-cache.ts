/**
 * One-time (or rare refresh) PokéAPI → local JSON cache.
 * Runtime gameplay must NEVER call PokéAPI — only read data/pokemon.json.
 *
 * Usage: npm run pokemon:build
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const POKE_COUNT = 1025;
const CONCURRENCY = 8;
const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

const outputPath = path.join(__dirname, "..", "data", "pokemon.json");

export type CachedPokemon = {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  abilities: string[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PokeApiPokemon = {
  id: number;
  name: string;
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string } }>;
  sprites: { front_default: string | null };
};

async function fetchPokemon(id: number): Promise<CachedPokemon> {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);

  if (!response.ok) {
    throw new Error(`PokéAPI ${id} failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as PokeApiPokemon;

  return {
    id: data.id,
    name: data.name,
    sprite: data.sprites.front_default ?? `${SPRITE_BASE}/${data.id}.png`,
    types: data.types.map((entry) => entry.type.name),
    abilities: data.abilities.map((entry) => entry.ability.name),
  };
}

async function fetchPokemonWithRetry(id: number, attempts = 4): Promise<CachedPokemon> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetchPokemon(id);
    } catch (error) {
      lastError = error;
      console.warn(`Retry ${attempt}/${attempts} for Pokémon ${id}:`, error);
      await sleep(500 * attempt);
    }
  }

  throw lastError;
}

async function build() {
  const results: CachedPokemon[] = new Array(POKE_COUNT);
  let completed = 0;

  for (let start = 1; start <= POKE_COUNT; start += CONCURRENCY) {
    const batchIds = Array.from(
      { length: Math.min(CONCURRENCY, POKE_COUNT - start + 1) },
      (_, index) => start + index,
    );

    const batch = await Promise.all(batchIds.map((id) => fetchPokemonWithRetry(id)));

    for (const pokemon of batch) {
      results[pokemon.id - 1] = pokemon;
    }

    completed += batch.length;
    console.log(`Fetched ${completed}/${POKE_COUNT}`);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

  console.log(`Done → ${outputPath} (${results.length} Pokémon)`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
