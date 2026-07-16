// National Pokédex number ranges per generation, verified against Bulbapedia
// and Serebii (https://bulbapedia.bulbagarden.net/wiki/National_Pok%C3%A9dex).
// Ranges are inclusive on both ends and contiguous, so e.g. Mew (#151) is the
// last Gen I Pokémon and Chikorita (#152) is the first Gen II Pokémon.
const GENERATION_RANGES: { generation: number; maxId: number }[] = [
  { generation: 1, maxId: 151 },
  { generation: 2, maxId: 251 },
  { generation: 3, maxId: 386 },
  { generation: 4, maxId: 493 },
  { generation: 5, maxId: 649 },
  { generation: 6, maxId: 721 },
  { generation: 7, maxId: 809 },
  { generation: 8, maxId: 905 },
  { generation: 9, maxId: 1025 },
];

const ROMAN_NUMERALS = ["I (1)", "II (2)", "III (3)", "IV (4)", "V (5)", "VI (6)", "VII (7)", "VIII (8)", "IX (9)"];

export function generationForPokemonId(id: number): number | null {
  const match = GENERATION_RANGES.find((range) => id <= range.maxId);
  return match?.generation ?? null;
}

export function formatGeneration(id: number): string {
  const generation = generationForPokemonId(id);
  if (generation === null) return "Unknown";
  return `Generation ${ROMAN_NUMERALS[generation - 1] ?? generation}`;
}
