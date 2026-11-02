// Default amount and macro preview for a search result.

import { macrosOf, type Macros } from "@/lib/nutrition/macros";
import { scaleNutrients, type NutrientMap } from "@/lib/nutrition/math";

import type { FoodHit } from "./types";

export type AmountPreview = {
  grams: number;
  label: string;
  macros: Macros;
  energyEstimated: boolean;
};

/** Macros for a weight of a food, by rule 1. */
export function macrosForGrams(per100g: NutrientMap, grams: number) {
  return macrosOf(scaleNutrients(per100g, grams));
}

/**
 * What one tap logs: the amount you used last time, else the food's first
 * portion, else 100 g.
 */
export function defaultAmount(hit: FoodHit): AmountPreview {
  let grams = 100;
  let label = "100 g";
  if (hit.lastUsed) {
    grams = hit.lastUsed.quantityG;
    label = hit.lastUsed.portionLabel ?? `${Number(grams.toFixed(1))} g`;
  } else if (hit.defaultPortion) {
    grams = hit.defaultPortion.grams;
    label = hit.defaultPortion.label;
  }
  const { energyEstimated, ...macros } = macrosForGrams(hit.per100g, grams);
  return { grams, label, macros, energyEstimated };
}
