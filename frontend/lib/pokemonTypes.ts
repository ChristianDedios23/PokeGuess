/** BDSP-style type icons from partywhale/pokemon-type-icons (MIT). */

const KNOWN_TYPES = new Set([
  "bug",
  "dark",
  "dragon",
  "electric",
  "fairy",
  "fighting",
  "fire",
  "flying",
  "ghost",
  "grass",
  "ground",
  "ice",
  "normal",
  "poison",
  "psychic",
  "rock",
  "steel",
  "water",
]);

export function pokemonTypeIconSrc(type: string): string | null {
  const key = type.trim().toLowerCase();
  if (!KNOWN_TYPES.has(key)) return null;
  return `/types/bdsp/${key}.svg`;
}
