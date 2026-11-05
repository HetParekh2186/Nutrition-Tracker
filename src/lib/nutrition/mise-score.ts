// The Mise score: one number from 0 to 100 for how good a food is, in the
// spirit of grocery scanner apps. Client-safe and pure.
//
//   nutrition  60  Nutri-Score points (UK FSA / 2017 general-food method),
//                  from Open Food Facts when it has them, else computed
//                  here from the stored nutrients per 100 g
//   additives  30  minus 10 for each additive of concern; a high-risk one
//                  takes all 30 and caps the score at 49
//   organic    10  certified organic on the label
//
// Additives and labels are only known for packaged foods from Open Food
// Facts. Everything else (USDA foods, custom foods) is scored on nutrition
// alone, scaled to 100, and says so.

import { N } from "./catalog";
import type { NutrientMap } from "./math";

const SATURATED_FAT = 1258;

export type ScoreRating = "excellent" | "good" | "poor" | "bad";

export type AdditiveRisk = "high" | "moderate";

export type ScoredAdditive = { code: string; name: string; risk: AdditiveRisk };

export type MiseScore = {
  score: number;
  rating: ScoreRating;
  /** "full" when additives and labels were known, else nutrition only. */
  basis: "full" | "nutrition";
  parts: {
    /** 0 to 100 before weighting. */
    nutrition: number;
    /** 0 to 30, or null when unknown. */
    additives: number | null;
    /** 0 or 10, or null when unknown. */
    organic: number | null;
  };
  /** Additives of concern found, worst first. */
  flagged: ScoredAdditive[];
};

/** What Open Food Facts adds beyond nutrients. Null means unknown. */
export type FoodQuality = {
  nutriscorePoints: number | null;
  /** OFF additive tags like "en:e250"; null when ingredients are unknown. */
  additives: string[] | null;
  organic: boolean | null;
};

export const NO_QUALITY: FoodQuality = {
  nutriscorePoints: null,
  additives: null,
  organic: null,
};

// Additives of concern, by E number. High: banned in the EU or classed as
// possible carcinogens (IARC 2B) with a clear mechanism; moderate: under
// review, linked to hyperactivity (the Southampton colours), or gut effects.
const ADDITIVES: Record<string, { name: string; risk: AdditiveRisk }> = {
  e171: { name: "Titanium dioxide", risk: "high" },
  e249: { name: "Potassium nitrite", risk: "high" },
  e250: { name: "Sodium nitrite", risk: "high" },
  e251: { name: "Sodium nitrate", risk: "high" },
  e252: { name: "Potassium nitrate", risk: "high" },
  e320: { name: "BHA", risk: "high" },
  e102: { name: "Tartrazine", risk: "moderate" },
  e104: { name: "Quinoline yellow", risk: "moderate" },
  e110: { name: "Sunset yellow", risk: "moderate" },
  e122: { name: "Carmoisine", risk: "moderate" },
  e124: { name: "Ponceau 4R", risk: "moderate" },
  e129: { name: "Allura red", risk: "moderate" },
  e150d: { name: "Sulphite ammonia caramel", risk: "moderate" },
  e211: { name: "Sodium benzoate", risk: "moderate" },
  e321: { name: "BHT", risk: "moderate" },
  e407: { name: "Carrageenan", risk: "moderate" },
  e433: { name: "Polysorbate 80", risk: "moderate" },
  e466: { name: "Carboxymethyl cellulose", risk: "moderate" },
  e951: { name: "Aspartame", risk: "moderate" },
};

/** One point for each threshold the value is above. */
function points(value: number, thresholds: number[]): number {
  let p = 0;
  for (const t of thresholds) if (value > t) p++;
  return p;
}

/**
 * Nutri-Score points for a general food per 100 g: lower is better, from
 * about -15 to 40. Fruit and vegetable content is not stored, so it counts
 * as none. Null when a nutrient that matters is missing.
 */
export function nutriscorePoints(per100g: NutrientMap): number | null {
  const kcal = per100g[N.energy];
  const sodium = per100g[N.sodium];
  if (kcal === undefined || sodium === undefined) return null;
  // Missing sugars or saturated fat are only safe to read as zero when the
  // carbs or fat they are part of are near zero (plain meat, oil-free foods).
  const sugars =
    per100g[N.sugars] ?? ((per100g[N.carbs] ?? Infinity) < 1 ? 0 : undefined);
  const satFat =
    per100g[SATURATED_FAT] ??
    ((per100g[N.fat] ?? Infinity) < 1 ? 0 : undefined);
  if (sugars === undefined || satFat === undefined) return null;

  const kj = kcal * 4.184;
  const negative =
    points(kj, [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]) +
    points(sugars, [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]) +
    points(satFat, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) +
    points(sodium, [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]);
  const fiber = points(per100g[N.fiber] ?? 0, [0.9, 1.9, 2.8, 3.7, 4.7]);
  const protein = points(per100g[N.protein] ?? 0, [1.6, 3.2, 4.8, 6.4, 8.0]);
  // Past 11 negative points protein no longer offsets (no fruit data here).
  return negative >= 11 ? negative - fiber : negative - fiber - protein;
}

// Nutri-Score points to a 0-100 nutrition score. The knots sit on the
// A/B/C/D/E grade boundaries, and it is linear between them so two nearly
// identical foods never land far apart.
const KNOTS: [number, number][] = [
  [-15, 100],
  [-1, 80],
  [2, 60],
  [10, 40],
  [18, 20],
  [40, 0],
];

export function nutritionScore(points: number): number {
  if (points <= KNOTS[0]![0]) return 100;
  for (let i = 1; i < KNOTS.length; i++) {
    const [x1, y1] = KNOTS[i]!;
    const [x0, y0] = KNOTS[i - 1]!;
    if (points <= x1) return y0 + ((points - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 0;
}

export function ratingFor(score: number): ScoreRating {
  if (score >= 75) return "excellent";
  if (score >= 50) return "good";
  if (score >= 25) return "poor";
  return "bad";
}

/** Additives of concern among OFF tags ("en:e250", "en:e150d"). */
export function flaggedAdditives(tags: string[]): ScoredAdditive[] {
  const found = new Map<string, ScoredAdditive>();
  for (const tag of tags) {
    const code = tag.replace(/^[a-z]{2}:/, "").toLowerCase();
    const info = ADDITIVES[code];
    if (info) found.set(code, { code: code.toUpperCase(), ...info });
  }
  return [...found.values()].sort(
    (a, b) => Number(b.risk === "high") - Number(a.risk === "high"),
  );
}

/** The Mise score, or null when there is not enough nutrition data. */
export function miseScore(
  per100g: NutrientMap,
  quality: FoodQuality = NO_QUALITY,
): MiseScore | null {
  const points = quality.nutriscorePoints ?? nutriscorePoints(per100g);
  if (points === null) return null;
  const nutrition = Math.round(nutritionScore(points));

  if (quality.additives === null) {
    return {
      score: nutrition,
      rating: ratingFor(nutrition),
      basis: "nutrition",
      parts: { nutrition, additives: null, organic: null },
      flagged: [],
    };
  }

  const flagged = flaggedAdditives(quality.additives);
  const high = flagged.some((a) => a.risk === "high");
  const additives = high ? 0 : Math.max(0, 30 - 10 * flagged.length);
  const organic = quality.organic ? 10 : 0;
  let score = Math.round(nutrition * 0.6 + additives + organic);
  if (high) score = Math.min(score, 49);
  return {
    score,
    rating: ratingFor(score),
    basis: "full",
    parts: { nutrition, additives, organic },
    flagged,
  };
}
