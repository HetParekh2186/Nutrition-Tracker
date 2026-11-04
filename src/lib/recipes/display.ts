// Ingredient lines for a recipe shown at a different serving count. The
// weight column already says the grams, so a gram amount in the text is
// dropped; any other amount ("1 tbsp", "2 cloves", "1 onion") is scaled so
// the line never contradicts the weight beside it. Pure, so tested.

const FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "¼": 0.25,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
};

// "450 g", "1 1/2 cups", "½ tsp", "2.5 kg", "3 large"
const LEADING =
  /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+\s*[½¼¾⅓⅔]?|[½¼¾⅓⅔])\s*(g|grams?|kg|ml|l|litres?|liters?|cups?|tbsp|tsp|cloves?|cans?|tins?|pinch(?:es)?|handfuls?|slices?|sprigs?|bunch(?:es)?|stalks?)?\.?(?=\s|$)\s*/i;

const MASS = /^(g|grams?|kg)$/i;

const PLURAL: Record<string, string> = {
  cup: "cups",
  clove: "cloves",
  can: "cans",
  tin: "tins",
  pinch: "pinches",
  handful: "handfuls",
  slice: "slices",
  sprig: "sprigs",
  bunch: "bunches",
  stalk: "stalks",
};
const SINGULAR = Object.fromEntries(
  Object.entries(PLURAL).map(([one, many]) => [many, one]),
);

function parseQuantity(raw: string): number {
  const s = raw.trim();
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\/(\d+)$/.exec(s);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const glyph = /^(\d*\.?\d*)\s*([½¼¾⅓⅔])$/.exec(s);
  if (glyph) return Number(glyph[1] || 0) + FRACTIONS[glyph[2]!]!;
  return Number(s);
}

/** 0.333 as "⅓", 1.5 as "1½", 2.4 as "2.4": how a cook writes amounts. */
export function formatCookQuantity(q: number): string {
  const whole = Math.floor(q + 1e-9);
  const rest = q - whole;
  for (const [glyph, value] of Object.entries(FRACTIONS)) {
    if (Math.abs(rest - value) < 0.03) return `${whole || ""}${glyph}`;
  }
  if (rest < 0.03) return String(whole);
  if (rest > 0.97) return String(whole + 1);
  return String(Number(q.toFixed(1)));
}

function fitUnit(unit: string, q: number): string {
  const lower = unit.toLowerCase();
  if (q > 1 && PLURAL[lower]) return PLURAL[lower]!;
  if (q <= 1 && SINGULAR[lower]) return SINGULAR[lower]!;
  return unit;
}

/**
 * How far an ingredient is scaled, read from the weights being shown, so the
 * text always agrees with the weight beside it.
 */
export function shownFactor(ing: { quantityG: number; scaledG: number }) {
  return ing.quantityG > 0 ? ing.scaledG / ing.quantityG : 1;
}

/**
 * The ingredient line for `factor` times the recipe's servings. Gram
 * amounts are dropped ("450 g chicken breast" reads "chicken breast");
 * other amounts are scaled. Text without a leading amount is unchanged.
 */
export function scaledIngredientText(text: string, factor: number): string {
  const m = LEADING.exec(text);
  if (!m) return text;
  const rest = text.slice(m[0].length);
  if (!rest) return text;
  const unit = m[2];
  if (unit && MASS.test(unit)) return rest;
  if (Math.abs(factor - 1) < 1e-9) return text;
  const q = parseQuantity(m[1]!) * factor;
  if (!Number.isFinite(q) || q <= 0) return text;
  return [formatCookQuantity(q), unit ? fitUnit(unit, q) : null, rest]
    .filter(Boolean)
    .join(" ");
}
