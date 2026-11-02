// Shapes returned by the foods API. Safe to import from client code.

import type { FoodSource } from "@/lib/db/schema";
import type { NutrientMap } from "@/lib/nutrition/math";

export type FoodHit = {
  id: number;
  name: string;
  brand: string | null;
  source: FoodSource;
  /** Per 100 g; missing values are unknown. */
  per100g: NutrientMap;
  defaultPortion: { label: string; grams: number } | null;
  /** Present for foods the user has logged before. */
  lastUsed: { quantityG: number; portionLabel: string | null } | null;
  uses: number;
};

export type FoodPortion = { id: number; label: string; grams: number };

export type FoodDetail = {
  id: number;
  name: string;
  brand: string | null;
  source: FoodSource;
  sourceId: string | null;
  isCustom: boolean;
  per100g: NutrientMap;
  energyEstimated: boolean;
  portions: FoodPortion[];
};

export type FoodSearchResult = {
  query: string;
  results: FoodHit[];
  /** Filled when the query is empty: what you log most and most recently. */
  recent: FoodHit[];
  frequent: FoodHit[];
};
