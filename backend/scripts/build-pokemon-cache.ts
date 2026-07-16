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
// Pause between each batch of concurrent requests so we don't hammer
// PokéAPI's servers — this is a one-time (or rare refresh) cache build.
const BATCH_DELAY_MS = 300;
const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

const outputPath = path.join(__dirname, "..", "data", "pokemon.json");

export type CachedPokemon = {
  id: number;
  name: string;
  sprite: string;
  /** Female front sprite when it differs; null if unavailable. */
  spriteFemale: string | null;
  /**
   * Species gender_rate from PokéAPI:
   * -1 = genderless, 0 = always male, 8 = always female,
   * 1–7 = female chance in eighths (e.g. 4 = 50%).
   */
  genderRate: number;
  hasGenderDifferences: boolean;
  types: string[];
  abilities: string[];
  /** Height in decimetres, as returned by PokéAPI. */
  height: number;
  /** Weight in hectograms, as returned by PokéAPI. */
  weight: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PokeApiPokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string } }>;
  sprites: {
    front_default: string | null;
    front_female: string | null;
  };
};

type PokeApiSpecies = {
  gender_rate: number;
  has_gender_differences: boolean;
};

async function fetchPokemon(id: number): Promise<CachedPokemon> {
  const [pokemonRes, speciesRes] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ]);

  if (!pokemonRes.ok) {
    throw new Error(`PokéAPI pokemon/${id} failed: ${pokemonRes.status} ${pokemonRes.statusText}`);
  }
  if (!speciesRes.ok) {
    throw new Error(
      `PokéAPI pokemon-species/${id} failed: ${speciesRes.status} ${speciesRes.statusText}`,
    );
  }

  const data = (await pokemonRes.json()) as PokeApiPokemon;
  const species = (await speciesRes.json()) as PokeApiSpecies;

  return {
    id: data.id,
    name: data.name,
    sprite: data.sprites.front_default ?? `${SPRITE_BASE}/${data.id}.png`,
    spriteFemale: data.sprites.front_female,
    genderRate: species.gender_rate,
    hasGenderDifferences: species.has_gender_differences,
    types: data.types.map((entry) => entry.type.name),
    abilities: data.abilities.map((entry) => entry.ability.name),
    height: data.height,
    weight: data.weight,
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

    if (completed < POKE_COUNT) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

  console.log(`Done → ${outputPath} (${results.length} Pokémon)`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
