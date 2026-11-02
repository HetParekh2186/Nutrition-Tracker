// AI recipe generation and adaptation (SPEC.md "Recipe generation and
// adaptation"). Claude writes words and structure; every number shown is
// recomputed here from USDA data. Dependencies are injected so the whole
// pipeline is testable without the API or the database.

import type { RecipeInput } from "@/lib/api/schemas";
import type { MealSlot } from "@/lib/db/enums";
import type { GeneratedRecipe } from "@/lib/llm/schemas";
import { formatAmount } from "@/lib/nutrition/format";
import type { Macros } from "@/lib/nutrition/macros";
import type { NutrientMap } from "@/lib/nutrition/math";

import { expandExclusion, wordStartPattern } from "./allergens";
import { needsRevision, recipeNutrition } from "./compute";

/** Below this, an ingredient is saved unmatched for the user to fix. */
export const MIN_MATCH_CONFIDENCE = 0.5;

export type DraftContext = {
  request: string;
  slot?: MealSlot | undefined;
  servings: number;
  target?: Partial<Macros> | undefined;
  preferences: {
    dietType: string | null;
    excluded: string[];
    disliked: string[];
    likedCuisines: string[];
    maxCookMinutes: number | null;
    equipment: string[];
    spiceLevel: number | null;
    notes: string | null;
  };
  /** For adaptation: the recipe being changed. */
  parent?: RecipeInput | undefined;
};

export type Revision = {
  previous: GeneratedRecipe;
  computed: Macros;
  problems: string[];
};

export type GenerateDeps = {
  draft: (ctx: DraftContext, revision?: Revision) => Promise<GeneratedRecipe>;
  resolve: (
    query: string,
  ) => Promise<{ foodId: number; name: string; confidence: number } | null>;
  foodMaps: (foodIds: number[]) => Promise<Map<number, NutrientMap>>;
  save: (
    input: RecipeInput,
    meta: {
      source: "ai_generated" | "ai_adapted";
      parentRecipeId: string | null;
    },
  ) => Promise<string>;
  onStatus?: (message: string) => void;
};

export type GenerateResult = {
  recipeId: string;
  perServing: Macros;
  unmatched: string[];
  revised: boolean;
  /** Still more than 10% off the target after the one revision round. */
  offTarget: boolean;
};

/**
 * Never-suggest rules an ingredient breaks, by rule name. Categories
 * expand to their foods, so "shellfish" catches shrimp.
 */
export function excludedHits(
  draft: GeneratedRecipe,
  excluded: string[],
): string[] {
  return excluded.filter((rule) =>
    expandExclusion(rule).some((word) => {
      const re = new RegExp(wordStartPattern(word, "js"), "i");
      return draft.ingredients.some(
        (ing) => re.test(ing.display_text) || re.test(ing.food_query),
      );
    }),
  );
}

type Matched = {
  input: RecipeInput;
  unmatched: string[];
  nutrition: ReturnType<typeof recipeNutrition>;
};

async function matchAndCompute(
  deps: GenerateDeps,
  draft: GeneratedRecipe,
  servings: number,
): Promise<Matched> {
  const resolutions = await Promise.all(
    draft.ingredients.map((ing) => deps.resolve(ing.food_query)),
  );
  const ingredients = draft.ingredients.map((ing, i) => {
    const r = resolutions[i];
    const ok = r && r.confidence >= MIN_MATCH_CONFIDENCE;
    // Scale weights when the user asked for a different serving count.
    const quantityG = (ing.quantity_g * servings) / draft.servings;
    return {
      displayText: ing.display_text,
      foodId: ok ? r.foodId : null,
      quantityG,
      isOptional: false,
      groupLabel: ing.group_label ?? null,
    };
  });
  const maps = await deps.foodMaps(
    ingredients.flatMap((i) => (i.foodId === null ? [] : [i.foodId])),
  );
  const nutrition = recipeNutrition(ingredients, servings, maps);
  const input: RecipeInput = {
    title: draft.title,
    description: draft.description,
    cuisine: draft.cuisine.toLowerCase(),
    mealTypes: [...new Set(draft.meal_types)],
    tags: [],
    servings,
    prepMinutes: draft.prep_minutes,
    cookMinutes: draft.cook_minutes,
    ingredients,
    steps: draft.steps.map((s) => ({
      instruction: s.instruction,
      timerSeconds: s.timer_seconds ?? null,
      ingredientIndexes: s.ingredient_indexes.filter(
        (i) => i >= 0 && i < ingredients.length,
      ),
    })),
  };
  return {
    input,
    unmatched: ingredients
      .filter((i) => i.foodId === null)
      .map((i) => i.displayText),
    nutrition,
  };
}

function describeProblems(
  computed: Macros,
  target: Partial<Macros> | undefined,
  excluded: string[],
): string[] {
  const problems: string[] = [];
  if (target && needsRevision(computed, target)) {
    const fmt = (k: keyof Macros, unit: "kcal" | "g", label: string) =>
      target[k] !== undefined
        ? `${label} ${formatAmount(computed[k], unit)} ${unit} (target ${formatAmount(target[k]!, unit)})`
        : null;
    problems.push(
      `Per serving it computes to ${[
        fmt("kcal", "kcal", "energy"),
        fmt("proteinG", "g", "protein"),
        fmt("carbsG", "g", "carbs"),
        fmt("fatG", "g", "fat"),
      ]
        .filter(Boolean)
        .join(", ")}. Adjust ingredients or weights so each is within 10%.`,
    );
  }
  if (excluded.length) {
    problems.push(
      `It uses excluded ingredients: ${excluded.join(", ")}. Remove them.`,
    );
  }
  return problems;
}

export async function runGeneration(
  deps: GenerateDeps,
  ctx: DraftContext,
  parentRecipeId: string | null = null,
): Promise<GenerateResult> {
  deps.onStatus?.(
    parentRecipeId ? "Adapting the recipe" : "Writing the recipe",
  );
  let draft = await deps.draft(ctx);
  deps.onStatus?.("Matching ingredients to USDA foods");
  let matched = await matchAndCompute(deps, draft, ctx.servings);
  let excluded = excludedHits(draft, ctx.preferences.excluded);
  let problems = describeProblems(
    matched.nutrition.macros,
    ctx.target,
    excluded,
  );
  let revised = false;

  // One revision round, then stop (SPEC.md).
  if (problems.length) {
    revised = true;
    deps.onStatus?.("Adjusting it to fit your targets");
    draft = await deps.draft(ctx, {
      previous: draft,
      computed: matched.nutrition.macros,
      problems,
    });
    matched = await matchAndCompute(deps, draft, ctx.servings);
    excluded = excludedHits(draft, ctx.preferences.excluded);
    problems = describeProblems(matched.nutrition.macros, ctx.target, excluded);
  }
  if (excluded.length) {
    throw new Error(
      `The recipe kept using ${excluded.join(", ")}, which you never want suggested. Try rephrasing the request.`,
    );
  }

  deps.onStatus?.("Saving");
  const recipeId = await deps.save(matched.input, {
    source: parentRecipeId ? "ai_adapted" : "ai_generated",
    parentRecipeId,
  });
  return {
    recipeId,
    perServing: matched.nutrition.macros,
    unmatched: matched.unmatched,
    revised,
    offTarget: Boolean(
      ctx.target && needsRevision(matched.nutrition.macros, ctx.target),
    ),
  };
}
