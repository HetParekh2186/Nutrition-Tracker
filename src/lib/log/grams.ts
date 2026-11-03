// Turn a parsed "2 large" or "1 cup" into grams for one food: its own USDA
// portions first, then a small built-in table for mass and volume units
// (SPEC.md "Plain-English logging", step 3). Pure, so tested.

import { GRAMS_PER_OZ } from "@/lib/foods/units";

type Portion = { label: string; grams: number };

export type GramsEstimate = {
  grams: number;
  /** What to store as portion_label, e.g. "2 × 1 large". */
  portionLabel: string | null;
  /** How the grams were reached; "guess" means check the amount. */
  method: "mass" | "portion" | "volume" | "guess";
};

const MASS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: GRAMS_PER_OZ,
  lb: 453.59237,
};

const VOLUME_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  "fl oz": 29.5735,
  cup: 236.588,
};

const ALIASES: Record<string, string> = {
  gram: "g",
  grams: "g",
  ounce: "oz",
  ounces: "oz",
  pound: "lb",
  pounds: "lb",
  lbs: "lb",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  cups: "cup",
};

/** "Tablespoons" -> "tbsp", "cups" -> "cup", "Slices." -> "slice". */
export function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  if (ALIASES[u]) return ALIASES[u];
  if (u in MASS || u in VOLUME_ML) return u;
  if (u.endsWith("es") && u.slice(0, -2) in VOLUME_ML) return u.slice(0, -2);
  if (u.endsWith("s") && u.length > 2) return u.slice(0, -1);
  return u;
}

/** Leading amount of a portion label: "1 cup" -> 1, "0.5 cup" -> 0.5. */
function labelAmount(label: string): number {
  const m = label.trim().match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?/);
  if (!m) return 1;
  const n = Number(m[1]);
  return m[2] ? n / Number(m[2]) : n || 1;
}

/** Words of a label without its amount: "1 cup, chopped" -> ["cup", "chopped"]. */
function labelWords(label: string): string[] {
  return (label.toLowerCase().match(/[a-z]+(?:\s+oz)?/g) ?? []).map(
    normalizeUnit,
  );
}

function portionMatching(portions: Portion[], unit: string): Portion | null {
  // Exact first word wins over a later mention ("1 large" vs "1 cup, large").
  return (
    portions.find((p) => labelWords(p.label)[0] === unit) ??
    portions.find((p) => labelWords(p.label).includes(unit)) ??
    null
  );
}

/** "1 large (8\" to 8-7/8\" long)" -> "1 large". */
function shortLabel(label: string): string {
  return label.replace(/\s*\(.*$/, "").trim();
}

/** A sensible single unit when the text gave none we can match. */
function defaultPortion(portions: Portion[]): Portion | undefined {
  const firstWord = (p: Portion) => labelWords(p.label)[0];
  return (
    portions.find((p) => firstWord(p) === "medium") ??
    portions.find((p) => labelWords(p.label).includes("serving")) ??
    portions.find((p) => {
      const w = firstWord(p);
      return w !== undefined && !(w in VOLUME_ML) && !(w in MASS);
    }) ??
    portions[0]
  );
}

function labelFor(quantity: number, portionLabel: string): string {
  const qty = Number(quantity.toFixed(2));
  return qty === 1 ? portionLabel : `${qty} × ${portionLabel}`;
}

const round = (n: number) => Math.round(n * 10) / 10;

export function estimateGrams(
  quantity: number,
  unit: string,
  portions: Portion[],
): GramsEstimate {
  const u = normalizeUnit(unit);

  if (MASS[u]) {
    return {
      grams: round(quantity * MASS[u]),
      portionLabel: u === "g" ? null : `${Number(quantity.toFixed(2))} ${u}`,
      method: "mass",
    };
  }

  const own = portionMatching(portions, u);
  if (own) {
    const perUnit = own.grams / labelAmount(own.label);
    return {
      grams: round(quantity * perUnit),
      portionLabel: labelFor(
        quantity,
        labelAmount(own.label) === 1 ? shortLabel(own.label) : `1 ${u}`,
      ),
      method: "portion",
    };
  }

  if (VOLUME_ML[u]) {
    // Use the food's density from any volume portion it has, else water.
    const volume = portions.find((p) =>
      labelWords(p.label).some((w) => w in VOLUME_ML),
    );
    const volUnit = volume
      ? labelWords(volume.label).find((w) => w in VOLUME_ML)
      : undefined;
    const gramsPerMl =
      volume && volUnit
        ? volume.grams / (labelAmount(volume.label) * VOLUME_ML[volUnit]!)
        : 1;
    return {
      grams: round(quantity * VOLUME_ML[u] * gramsPerMl),
      portionLabel: labelFor(quantity, `1 ${u}`),
      method: volume ? "volume" : "guess",
    };
  }

  // "serving", "piece", "medium" with no matching portion: one of the
  // food's own portions per unit, or 100 g, flagged as a guess.
  const fallback = defaultPortion(portions);
  if (fallback) {
    const perUnit = fallback.grams / labelAmount(fallback.label);
    return {
      grams: round(quantity * perUnit),
      portionLabel: labelFor(
        quantity,
        labelAmount(fallback.label) === 1
          ? shortLabel(fallback.label)
          : "1 portion",
      ),
      method: "guess",
    };
  }
  return { grams: round(quantity * 100), portionLabel: null, method: "guess" };
}
