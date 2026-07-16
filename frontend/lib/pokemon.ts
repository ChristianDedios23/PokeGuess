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
