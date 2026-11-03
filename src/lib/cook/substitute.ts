// Ingredient substitutions in Cook Mode (SPEC.md "Cook Mode assistant").
// The assistant proposes; the server computes the per-serving macro
// change from USDA data; the user accepts or rejects.

import type { Macros } from "@/lib/nutrition/macros";
import type { NutrientMap } from "@/lib/nutrition/math";
import { recipeNutrition, type IngredientRef } from "@/lib/recipes/compute";

/** Stored in cook_sessions.substitutions (spec fields plus display names). */
export type Substitution = {
  ingredientId: number;
  newFoodId: number;
  /** Raw grams for the recipe's own serving count. */
  quantityG: number;
  reason: string;
  newFoodName?: string | undefined;
  displayText?: string | undefined;
};

export type CookIngredient = IngredientRef & {
  id: number;
  displayText: string;
  foodName?: string | null;
};

/** The recipe's ingredients with accepted swaps applied (latest wins). */
export function applySubstitutions<T extends CookIngredient>(
  ingredients: T[],
  subs: Substitution[],
): T[] {
  const latest = new Map(subs.map((s) => [s.ingredientId, s]));
  return ingredients.map((ing) => {
    const s = latest.get(ing.id);
    return s
      ? {
          ...ing,
          foodId: s.newFoodId,
          quantityG: s.quantityG,
          displayText: s.displayText ?? ing.displayText,
          foodName: s.newFoodName ?? ing.foodName ?? null,
        }
      : ing;
  });
}

export type MacroDiff = { before: Macros; after: Macros; delta: Macros };

/** Per-serving macros before and after one more swap. */
export function substitutionDiff(
  ingredients: CookIngredient[],
  accepted: Substitution[],
  proposal: Substitution,
  servings: number,
  foodMaps: Map<number, NutrientMap>,
): MacroDiff {
  const before = recipeNutrition(
    applySubstitutions(ingredients, accepted),
    servings,
    foodMaps,
  ).macros;
  const after = recipeNutrition(
    applySubstitutions(ingredients, [...accepted, proposal]),
    servings,
    foodMaps,
  ).macros;
  const delta = {
    kcal: after.kcal - before.kcal,
    proteinG: after.proteinG - before.proteinG,
    carbsG: after.carbsG - before.carbsG,
    fatG: after.fatG - before.fatG,
    fiberG: after.fiberG - before.fiberG,
  };
  return { before, after, delta };
}
