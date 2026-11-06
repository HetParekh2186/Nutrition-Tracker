import type { MealSlot } from "@/lib/db/enums";
import type { RecipeSummaryDTO } from "@/lib/recipes/types";

import type { Budget } from "./budget";
import type { Terms } from "./score";

export type RecommendationDTO = {
  recipe: RecipeSummaryDTO;
  score: number;
  breakdown: Terms;
  reasons: string[];
  saved: boolean;
  /** Ingredients the user has not logged, shown on the card. */
  newIngredients: string[];
};

export type RecommendationsDTO = {
  slot: MealSlot;
  date: string;
  budget: Budget;
  /** False until the user has any history; suggestions lean on cuisines. */
  personalized: boolean;
  items: RecommendationDTO[];
};
