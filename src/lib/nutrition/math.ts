// Pure nutrition math (SPEC.md "Nutrition calculation rules" 1 to 3 and 7).
// A nutrient missing from a map means unknown, never zero.

import { N } from "./catalog";

/** nutrient id -> amount. Absent keys are unknown. */
export type NutrientMap = Record<number, number>;

/** Rule 1: amount for a logged weight. */
export function amountForGrams(amountPer100g: number, grams: number): number {
  return (amountPer100g * grams) / 100;
}

/** Rule 1 for every nutrient a food has. */
export function scaleNutrients(
  per100g: NutrientMap,
  grams: number,
): NutrientMap {
  const out: NutrientMap = {};
  for (const [id, amount] of Object.entries(per100g)) {
    out[Number(id)] = amountForGrams(amount, grams);
  }
  return out;
}

/** Multiply every amount, e.g. per-serving values by servings eaten. */
export function multiplyNutrients(
  map: NutrientMap,
  factor: number,
): NutrientMap {
  const out: NutrientMap = {};
  for (const [id, amount] of Object.entries(map)) {
    out[Number(id)] = amount * factor;
  }
  return out;
}

export type Coverage = { known: number; total: number };

export type Totals = {
  amounts: NutrientMap;
  /** How many of the summed items had data for each nutrient. */
  coverage: Record<number, Coverage>;
  itemCount: number;
};

/**
 * Sum nutrient maps (rule 3). A nutrient appears in `amounts` if at least one
 * item has it; `coverage` records how many items did, so the UI can say
 * "Vitamin K: 62 µg (data for 7 of 9 foods)".
 */
export function sumNutrients(items: NutrientMap[]): Totals {
  const amounts: NutrientMap = {};
  const known: Record<number, number> = {};
  for (const item of items) {
    for (const [key, amount] of Object.entries(item)) {
      const id = Number(key);
      amounts[id] = (amounts[id] ?? 0) + amount;
      known[id] = (known[id] ?? 0) + 1;
    }
  }
  const coverage: Record<number, Coverage> = {};
  for (const [id, count] of Object.entries(known)) {
    coverage[Number(id)] = { known: count, total: items.length };
  }
  return { amounts, coverage, itemCount: items.length };
}

export type Ingredient = { per100g: NutrientMap; grams: number };

/**
 * Rule 2: per-serving nutrition for a recipe. Use raw ingredient weights.
 * Coverage counts ingredients, so a missing nutrient on one ingredient shows
 * as incomplete instead of silently lowering the total.
 */
export function recipePerServing(
  ingredients: Ingredient[],
  servings: number,
): Totals {
  if (!(servings > 0)) throw new RangeError("servings must be greater than 0");
  const total = sumNutrients(
    ingredients.map((i) => scaleNutrients(i.per100g, i.grams)),
  );
  return { ...total, amounts: multiplyNutrients(total.amounts, 1 / servings) };
}

/** Atwater estimate: 4 kcal/g protein and carbs, 9 kcal/g fat. */
export function atwaterKcal(
  protein: number,
  carbs: number,
  fat: number,
): number {
  return 4 * protein + 4 * carbs + 9 * fat;
}

export type EnergyValue = { kcal: number; estimated: boolean };

/**
 * Energy for a nutrient map (rule 7): the stored value when present,
 * otherwise an Atwater estimate flagged as estimated. Returns null when the
 * macros needed for the estimate are missing too.
 */
export function energyOf(map: NutrientMap): EnergyValue | null {
  const stored = map[N.energy];
  if (stored !== undefined) return { kcal: stored, estimated: false };
  const protein = map[N.protein];
  const carbs = map[N.carbs];
  const fat = map[N.fat];
  if (protein === undefined || carbs === undefined || fat === undefined) {
    return null;
  }
  return { kcal: atwaterKcal(protein, carbs, fat), estimated: true };
}

/** Fill in Energy with an Atwater estimate when a food is missing it. */
export function withEstimatedEnergy(map: NutrientMap): {
  map: NutrientMap;
  energyEstimated: boolean;
} {
  const energy = energyOf(map);
  if (!energy || !energy.estimated) return { map, energyEstimated: false };
  return { map: { ...map, [N.energy]: energy.kcal }, energyEstimated: true };
}

/** Rule 3: target minus consumed. Negative means over. */
export function remaining(target: number, consumed: number): number {
  return target - consumed;
}
