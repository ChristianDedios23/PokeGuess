// PokéAPI reports height in decimetres and weight in hectograms. These
// helpers format both in the metric + imperial style used on pokemondb.net,
// e.g. Height "0.6 m (2′00″)" and Weight "8.5 kg (18.7 lbs)".
const METERS_PER_INCH = 0.0254;
const LBS_PER_KG = 2.20462;

export function formatHeight(decimetres: number): string {
  const meters = decimetres / 10;
  const totalInches = meters / METERS_PER_INCH;

  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    inches = 0;
    feet += 1;
  }

  return `${meters.toFixed(1)} m (${feet}′${String(inches).padStart(2, "0")}″)`;
}

export function formatWeight(hectograms: number): string {
  const kg = hectograms / 10;
  const lbs = kg * LBS_PER_KG;

  return `${kg.toFixed(1)} kg (${lbs.toFixed(1)} lbs)`;
}
