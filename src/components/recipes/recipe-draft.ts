// Editor form state. Plain module (no "use client") so server pages can
// build initial drafts.

import type { MealSlot } from "@/lib/db/enums";

export type IngredientDraft = {
  key: string;
  displayText: string;
  grams: string;
  foodId: number | null;
  foodName: string | null;
  groupLabel: string | null;
};

export type StepDraft = {
  key: string;
  instruction: string;
  timerMinutes: string;
  ingredientIndexes: number[];
};

export type RecipeDraft = {
  title: string;
  description: string;
  cuisine: string;
  mealTypes: MealSlot[];
  servings: string;
  prepMinutes: string;
  cookMinutes: string;
  ingredients: IngredientDraft[];
  steps: StepDraft[];
};

let keySeq = 0;
const newKey = () => `k${++keySeq}`;

export const emptyIngredient = (): IngredientDraft => ({
  key: newKey(),
  displayText: "",
  grams: "",
  foodId: null,
  foodName: null,
  groupLabel: null,
});
export const emptyStep = (): StepDraft => ({
  key: newKey(),
  instruction: "",
  timerMinutes: "",
  ingredientIndexes: [],
});
