// Recipe nutrition from its ingredients (SPEC.md rule 2). Pure, so tested.

import { macrosOf, type Macros } from "@/lib/nutrition/macros";
import {
  recipePerServing,
  type NutrientMap,
  type Totals,
} from "@/lib/nutrition/math";

export type IngredientRef = { foodId: number | null; quantityG: number };

export type RecipeNutrition = {
  perServing: Totals;
  macros: Macros;
  /** Ingredients with no food match; they are left out of the totals. */
  unmatched: number;
};

/**
 * Per-serving nutrition from raw ingredient weights. Unmatched ingredients
 * (no food yet) count as unknown, never as zero calories, so the caller
 * can flag the recipe.
 */
export function recipeNutrition(
  ingredients: IngredientRef[],
  servings: number,
  foodMaps: Map<number, NutrientMap>,
): RecipeNutrition {
  const matched = ingredients.flatMap((i) => {
    const per100g = i.foodId === null ? undefined : foodMaps.get(i.foodId);
    return per100g ? [{ per100g, grams: i.quantityG }] : [];
  });
  const perServing = recipePerServing(matched, servings);
  const { energyEstimated: _e, ...macros } = macrosOf(perServing.amounts);
  return {
    perServing,
    macros,
    unmatched: ingredients.length - matched.length,
  };
}

/** Ingredient weight when the recipe is made for a different serving count. */
export function scaleQuantity(
  quantityG: number,
  baseServings: number,
  servings: number,
): number {
  return (quantityG * servings) / baseServings;
}

/** How far each macro is from a target, as a fraction (0.1 = 10% off). */
export function macroDeviation(actual: Macros, target: Partial<Macros>) {
  const keys = ["kcal", "proteinG", "carbsG", "fatG"] as const;
  return Object.fromEntries(
    keys.flatMap((k) => {
      const t = target[k];
      if (t === undefined || t <= 0) return [];
      return [[k, Math.abs(actual[k] - t) / t]];
    }),
  ) as Partial<Record<(typeof keys)[number], number>>;
}

/** SPEC.md: revise when any macro is more than 10% off the target. */
export function needsRevision(
  actual: Macros,
  target: Partial<Macros>,
  tolerance = 0.1,
): boolean {
  return Object.values(macroDeviation(actual, target)).some(
    (d) => d > tolerance,
  );
}
