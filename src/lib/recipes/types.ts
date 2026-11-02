// Recipe shapes for the API. Client-safe.

import type { MealSlot } from "@/lib/db/enums";
import type { NutrientRowDTO } from "@/lib/diary/types";
import type { Macros } from "@/lib/nutrition/macros";

export type RecipeSource = "user" | "ai_generated" | "ai_adapted" | "imported";

export type RecipeSummaryDTO = {
  id: string;
  title: string;
  description: string | null;
  cuisine: string | null;
  mealTypes: MealSlot[];
  tags: string[];
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  coverSeed: number;
  source: RecipeSource;
  isOwn: boolean;
  perServing: Macros;
  unmatched: number;
};

export type RecipeIngredientDTO = {
  id: number;
  position: number;
  foodId: number | null;
  foodName: string | null;
  /** Raw weight for the recipe's own serving count. */
  quantityG: number;
  /** Weight for the serving count being viewed. */
  scaledG: number;
  displayText: string;
  isOptional: boolean;
  groupLabel: string | null;
};

export type RecipeStepDTO = {
  id: number;
  position: number;
  instruction: string;
  timerSeconds: number | null;
  ingredientIds: number[];
};

export type RecipeDetailDTO = RecipeSummaryDTO & {
  parentRecipeId: string | null;
  parentTitle: string | null;
  /** Serving count the quantities are scaled to. */
  viewServings: number;
  nutrients: NutrientRowDTO[];
  ingredients: RecipeIngredientDTO[];
  steps: RecipeStepDTO[];
  createdAt: string;
  saved: boolean;
  myRating: number | null;
  cookCount: number;
};
