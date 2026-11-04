// Saved meal shapes for the API. Client-safe.

import type { Macros } from "@/lib/nutrition/macros";

export type MealItemDTO = {
  kind: "food" | "recipe";
  foodId: number | null;
  recipeId: string | null;
  name: string;
  brand: string | null;
  quantityG: number | null;
  portionLabel: string | null;
  servings: number | null;
  macros: Macros;
};

export type MealDTO = {
  id: string;
  name: string;
  items: MealItemDTO[];
  /** Sum of the items, as saved. */
  macros: Macros;
  updatedAt: string;
};
