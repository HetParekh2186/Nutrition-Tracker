// Production wiring for recipe generation: Claude for the draft, the food
// resolver for matching, Postgres for nutrition and storage.

import { getDaySummary } from "@/lib/diary/repo";
import { nutrientMapsFor } from "@/lib/foods/repo";
import { resolveFoodQuery } from "@/lib/foods/resolve";
import { RECIPE_WRITER_SYSTEM } from "@/lib/llm/prompts";
import { GeneratedRecipe } from "@/lib/llm/schemas";
import { structuredCall } from "@/lib/llm/structured";
import { formatAmount } from "@/lib/nutrition/format";
import type { Macros } from "@/lib/nutrition/macros";
import { getPreferences } from "@/lib/profile/repo";
import { slotBudget } from "@/lib/recommend/budget";
import type { MealSlot } from "@/lib/db/enums";

import type { DraftContext, GenerateDeps, Revision } from "./generate";
import { createRecipe } from "./repo";

function describeTarget(t: Partial<Macros> | undefined): string {
  if (!t) return "No specific targets.";
  const parts = [
    t.kcal !== undefined ? `${formatAmount(t.kcal, "kcal")} kcal` : null,
    t.proteinG !== undefined
      ? `${formatAmount(t.proteinG, "g")} g protein`
      : null,
    t.carbsG !== undefined ? `${formatAmount(t.carbsG, "g")} g carbs` : null,
    t.fatG !== undefined ? `${formatAmount(t.fatG, "g")} g fat` : null,
  ].filter(Boolean);
  return `Per serving, aim for about ${parts.join(", ")}.`;
}

/** Only the context the task needs (SPEC.md): prefs, targets, the parent. */
function userMessage(ctx: DraftContext): string {
  const p = ctx.preferences;
  const lines = [
    ctx.parent
      ? `Adapt this recipe: ${ctx.request}`
      : `Write a recipe: ${ctx.request}`,
    ctx.slot ? `Meal: ${ctx.slot}.` : null,
    `Servings: ${ctx.servings}.`,
    describeTarget(ctx.target),
    `Diet: ${p.dietType ?? "no restrictions"}.`,
    p.excluded.length ? `Never use: ${p.excluded.join(", ")}.` : null,
    p.disliked.length ? `Avoid if possible: ${p.disliked.join(", ")}.` : null,
    p.likedCuisines.length
      ? `Cuisines they enjoy: ${p.likedCuisines.join(", ")}.`
      : null,
    p.maxCookMinutes ? `Total time limit: ${p.maxCookMinutes} minutes.` : null,
    p.equipment.length
      ? `Equipment available: ${p.equipment.join(", ")}.`
      : null,
    p.spiceLevel !== null
      ? `Spice level: ${["none", "mild", "medium", "hot"][p.spiceLevel]}.`
      : null,
    p.notes ? `Notes from them: ${p.notes}` : null,
  ];
  let text = lines.filter(Boolean).join("\n");
  if (ctx.parent) {
    text += `\n\nOriginal recipe (keep what the request does not change):\n${JSON.stringify(ctx.parent)}`;
  }
  return text;
}

export function productionDeps(
  userId: string,
  onStatus?: (message: string) => void,
): GenerateDeps {
  return {
    draft: (ctx: DraftContext, revision?: Revision) =>
      structuredCall({
        userId,
        feature: ctx.parent ? "recipe_adapt" : "recipe_generate",
        system: RECIPE_WRITER_SYSTEM,
        schema: GeneratedRecipe,
        effort: "medium",
        messages: [
          { role: "user", content: userMessage(ctx) },
          ...(revision
            ? [
                {
                  role: "assistant" as const,
                  content: JSON.stringify(revision.previous),
                },
                {
                  role: "user" as const,
                  content: `Mise computed this recipe from USDA data. ${revision.problems.join(" ")} Return the full revised recipe.`,
                },
              ]
            : []),
        ],
      }),
    resolve: async (query) => {
      const r = await resolveFoodQuery(userId, query);
      return r.best
        ? { foodId: r.best.id, name: r.best.name, confidence: r.confidence }
        : null;
    },
    foodMaps: async (ids) =>
      new Map(
        [...(await nutrientMapsFor(ids))].map(
          ([id, v]) => [id, v.map] as const,
        ),
      ),
    save: (input, meta) => createRecipe(userId, input, meta),
    ...(onStatus ? { onStatus } : {}),
  };
}

/** Preferences and default targets (the slot's remaining budget). */
export async function draftContext(
  userId: string,
  options: {
    request: string;
    slot?: MealSlot | undefined;
    servings: number;
    target?: Partial<Macros> | undefined;
    date: string;
  },
): Promise<DraftContext> {
  const [prefs, summary] = await Promise.all([
    getPreferences(userId),
    options.target || !options.slot
      ? null
      : getDaySummary(userId, options.date),
  ]);
  const budget =
    summary && options.slot
      ? slotBudget(summary.remaining, options.slot)
      : undefined;
  // A budget already spent is no target at all.
  const target =
    options.target ?? (budget && budget.kcal > 150 ? budget : undefined);
  return {
    request: options.request,
    slot: options.slot,
    servings: options.servings,
    target,
    preferences: {
      dietType: prefs.dietType,
      excluded: prefs.excludedIngredients,
      disliked: prefs.dislikedIngredients,
      likedCuisines: prefs.likedCuisines,
      maxCookMinutes: prefs.maxCookMinutes,
      equipment: prefs.equipment,
      spiceLevel: prefs.spiceLevel,
      notes: prefs.notes,
    },
  };
}
