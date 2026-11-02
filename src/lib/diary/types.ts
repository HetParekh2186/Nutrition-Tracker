// Shapes returned by the diary and summary APIs. Safe to import from client
// code.

import type { LoggedVia, MealSlot } from "@/lib/db/enums";
import type { NutrientCategory, NutrientUnit } from "@/lib/nutrition/catalog";
import type { Macros } from "@/lib/nutrition/macros";

export type DiaryEntryDTO = {
  id: number;
  entryDate: string;
  mealSlot: MealSlot;
  kind: "food" | "recipe";
  foodId: number | null;
  recipeId: string | null;
  name: string;
  brand: string | null;
  quantityG: number | null;
  servings: number | null;
  portionLabel: string | null;
  loggedVia: LoggedVia;
  createdAt: string;
  macros: Macros;
  energyEstimated: boolean;
};

export type DiaryDayDTO = {
  date: string;
  slots: Record<MealSlot, DiaryEntryDTO[]>;
};

export type NutrientRowDTO = {
  id: number;
  name: string;
  unit: NutrientUnit;
  category: NutrientCategory;
  /** Null when no logged item had data for this nutrient. */
  amount: number | null;
  known: number;
  total: number;
  target: { min: number | null; max: number | null } | null;
};

export type DaySummaryDTO = {
  date: string;
  timezone: string;
  entryCount: number;
  consumed: Macros;
  target: Macros;
  remaining: Macros;
  energyEstimated: boolean;
  targetsAreDefaults: boolean;
  nutrients: NutrientRowDTO[];
};
