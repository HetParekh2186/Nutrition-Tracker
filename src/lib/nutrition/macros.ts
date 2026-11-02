// The four headline macros (plus fiber) pulled out of a nutrient map.

import { N } from "./catalog";
import { energyOf, type NutrientMap } from "./math";

export type Macros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

export const ZERO_MACROS: Macros = {
  kcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
};

/**
 * Macros for display. A missing macro shows as 0 here; coverage elsewhere
 * tells the user when data was incomplete.
 */
export function macrosOf(
  map: NutrientMap,
): Macros & { energyEstimated: boolean } {
  const energy = energyOf(map);
  return {
    kcal: energy?.kcal ?? 0,
    energyEstimated: energy?.estimated ?? false,
    proteinG: map[N.protein] ?? 0,
    carbsG: map[N.carbs] ?? 0,
    fatG: map[N.fat] ?? 0,
    fiberG: map[N.fiber] ?? 0,
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
    fiberG: a.fiberG + b.fiberG,
  };
}

export function subtractMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal - b.kcal,
    proteinG: a.proteinG - b.proteinG,
    carbsG: a.carbsG - b.carbsG,
    fatG: a.fatG - b.fatG,
    fiberG: a.fiberG - b.fiberG,
  };
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    kcal: m.kcal * factor,
    proteinG: m.proteinG * factor,
    carbsG: m.carbsG * factor,
    fatG: m.fatG * factor,
    fiberG: m.fiberG * factor,
  };
}
