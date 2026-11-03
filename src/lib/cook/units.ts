// convert_units for the Cook Mode assistant. Mass and volume convert
// exactly; crossing between them needs the food's own portion weights
// (a cup of flour is not a cup of water), else water density is assumed
// and said so.

const MASS_G: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.349523125,
  ounce: 28.349523125,
  ounces: 28.349523125,
  lb: 453.59237,
  lbs: 453.59237,
  pound: 453.59237,
  pounds: 453.59237,
};

const VOLUME_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  millilitre: 1,
  l: 1000,
  liter: 1000,
  litre: 1000,
  tsp: 4.92892,
  teaspoon: 4.92892,
  tbsp: 14.7868,
  tablespoon: 14.7868,
  "fl oz": 29.5735,
  cup: 236.588,
  cups: 236.588,
};

const norm = (u: string) => u.trim().toLowerCase().replace(/\.$/, "");

export type Conversion = {
  quantity: number;
  unit: string;
  /** How the answer was reached when it involves an assumption. */
  note?: string;
};

/**
 * Convert between units. `gramsPerMl` is the food's density from its USDA
 * portions, if known.
 */
export function convertUnits(
  quantity: number,
  from: string,
  to: string,
  gramsPerMl?: number | null,
): Conversion | null {
  const f = norm(from);
  const t = norm(to);
  const round = (n: number) => Number(n.toPrecision(3));

  if (MASS_G[f] && MASS_G[t]) {
    return { quantity: round((quantity * MASS_G[f]) / MASS_G[t]), unit: to };
  }
  if (VOLUME_ML[f] && VOLUME_ML[t]) {
    return {
      quantity: round((quantity * VOLUME_ML[f]) / VOLUME_ML[t]),
      unit: to,
    };
  }
  const density = gramsPerMl ?? null;
  const note = density
    ? "using this food's USDA portion weight"
    : "assuming the density of water; weigh it if it matters";
  const d = density ?? 1;
  if (VOLUME_ML[f] && MASS_G[t]) {
    return {
      quantity: round((quantity * VOLUME_ML[f] * d) / MASS_G[t]),
      unit: to,
      note,
    };
  }
  if (MASS_G[f] && VOLUME_ML[t]) {
    return {
      quantity: round((quantity * MASS_G[f]) / d / VOLUME_ML[t]),
      unit: to,
      note,
    };
  }
  return null;
}

/** Grams per ml from a USDA portion label like "1 cup" or "1 tbsp". */
export function densityFromPortion(
  label: string,
  grams: number,
): number | null {
  const m = label
    .toLowerCase()
    .match(/^([\d.]+)\s*(cup|cups|tbsp|tablespoon|tsp|teaspoon|fl oz)\b/);
  if (!m) return null;
  const amount = Number(m[1]);
  const ml = VOLUME_ML[m[2]!];
  if (!ml || !(amount > 0)) return null;
  return grams / (amount * ml);
}
