// Zod schemas for every LLM output (SPEC.md "LLM features").

import { z } from "zod";

// 1. Plain-English logging
export const ParsedItem = z.object({
  text: z.string(), // "2 eggs"
  food_query: z.string(), // "egg, whole, raw"
  quantity: z.number().positive(),
  unit: z.string(), // "large", "g", "cup", "slice"
});
export const ParseResult = z.object({ items: z.array(ParsedItem).max(20) });
export type ParseResult = z.infer<typeof ParseResult>;

// 2. Recipe generation and adaptation
export const GeneratedRecipe = z.object({
  title: z.string(),
  description: z.string(),
  cuisine: z.string(),
  meal_types: z.array(z.enum(["breakfast", "lunch", "dinner", "snack"])),
  servings: z.number().positive(),
  prep_minutes: z.number().int(),
  cook_minutes: z.number().int(),
  ingredients: z.array(
    z.object({
      display_text: z.string(), // "2 cloves garlic, minced"
      food_query: z.string(), // "garlic, raw"
      quantity_g: z.number().nonnegative(),
      group_label: z.string().optional(),
    }),
  ),
  steps: z.array(
    z.object({
      instruction: z.string(),
      timer_seconds: z.number().int().optional(),
      ingredient_indexes: z.array(z.number().int()),
    }),
  ),
});
export type GeneratedRecipe = z.infer<typeof GeneratedRecipe>;
