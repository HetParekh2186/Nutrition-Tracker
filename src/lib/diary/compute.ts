// Turns stored diary rows into nutrient maps using lib/nutrition only.

import {
  multiplyNutrients,
  scaleNutrients,
  type NutrientMap,
} from "@/lib/nutrition/math";

export type EntrySource = {
  foodId: number | null;
  recipeId: string | null;
  quantityG: number | null;
  servings: number | null;
};

/**
 * Nutrients eaten for one entry: foods by rule 1, recipes as per-serving
 * values times servings (rule 3). Unknown sources yield an empty map.
 */
export function entryNutrients(
  entry: EntrySource,
  foodMaps: Map<number, NutrientMap>,
  recipeMaps: Map<string, NutrientMap>,
): NutrientMap {
  if (entry.foodId !== null && entry.quantityG !== null) {
    const per100g = foodMaps.get(entry.foodId);
    return per100g ? scaleNutrients(per100g, entry.quantityG) : {};
  }
  if (entry.recipeId !== null && entry.servings !== null) {
    const perServing = recipeMaps.get(entry.recipeId);
    return perServing ? multiplyNutrients(perServing, entry.servings) : {};
  }
  return {};
}
