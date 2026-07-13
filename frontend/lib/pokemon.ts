import { API_BASE } from "./config";

export interface PokemonSummary {
  id: number;
  name: string;
  sprite: string;
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
      .then(({ pokemon }) => new Map(pokemon.map((entry) => [entry.id, entry])))
      .catch((err: unknown) => {
        catalogPromise = null;
        throw err;
      });
  }

  return catalogPromise;
}
