// Seeds the shared starter recipe library (owner_id null). Every
// ingredient is matched to a USDA food by exact name, so the nutrition
// cache is computed from real data. Re-running replaces each recipe's
// ingredients and steps in place, keeping ids that diaries point to.
//
// Usage: pnpm seed:recipes

import type { RecipeInput } from "@/lib/api/schemas";
import { getDb } from "@/lib/db";
import { createRecipe, rebuildNutrition } from "@/lib/recipes/repo";
import { withDietTags } from "@/lib/recipes/diet";
import { recipeIngredients, recipes, recipeSteps } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

import { scriptSql } from "./lib/db";
import { STARTER_RECIPES, type StarterRecipe } from "./lib/starter-recipes";

async function resolveNames(
  sql: ReturnType<typeof scriptSql>,
  names: string[],
) {
  const ids = new Map<string, number>();
  const missing: string[] = [];
  for (const name of new Set(names)) {
    const [row] = await sql<{ id: string }[]>`
      select id from foods
       where owner_id is null and (name = ${name} or name ilike ${`${name} (%`})
       order by (name = ${name}) desc, length(name)
       limit 1
    `;
    if (row) ids.set(name, Number(row.id));
    else missing.push(name);
  }
  return { ids, missing };
}

function toInput(r: StarterRecipe, ids: Map<string, number>): RecipeInput {
  return {
    title: r.title,
    description: r.description,
    cuisine: r.cuisine,
    mealTypes: r.mealTypes,
    tags: r.tags,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    ingredients: r.ingredients.map(([displayText, usdaName, grams]) => ({
      displayText,
      foodId: ids.get(usdaName) ?? null,
      quantityG: grams,
      isOptional: false,
      groupLabel: null,
    })),
    steps: r.steps.map(([instruction, timerSeconds, ingredientIndexes]) => ({
      instruction,
      timerSeconds,
      ingredientIndexes,
    })),
  };
}

async function main() {
  const sql = scriptSql();
  try {
    const { ids, missing } = await resolveNames(
      sql,
      STARTER_RECIPES.flatMap((r) => r.ingredients.map(([, name]) => name)),
    );
    if (missing.length) {
      console.warn(
        `Unmatched USDA names (saved without a food):\n  ${missing.join("\n  ")}`,
      );
    }
    const db = getDb();
    let created = 0;
    let updated = 0;
    for (const r of STARTER_RECIPES) {
      const input = toInput(r, ids);
      const [existing] = await db
        .select({ id: recipes.id })
        .from(recipes)
        .where(and(isNull(recipes.ownerId), eq(recipes.title, r.title)));
      if (!existing) {
        await createRecipe(null, input, { source: "imported" });
        created++;
        continue;
      }
      // Update in place so diary entries that reference the id survive.
      await db.transaction(async (tx) => {
        await tx
          .update(recipes)
          .set({
            description: input.description,
            cuisine: input.cuisine,
            mealTypes: input.mealTypes,
            tags: withDietTags(input.tags, [
              ...input.ingredients.map((i) => i.displayText),
              ...r.ingredients.map(([, usdaName]) => usdaName),
            ]),
            servings: input.servings,
            prepMinutes: input.prepMinutes,
            cookMinutes: input.cookMinutes,
          })
          .where(eq(recipes.id, existing.id));
        await tx
          .delete(recipeSteps)
          .where(eq(recipeSteps.recipeId, existing.id));
        await tx
          .delete(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, existing.id));
        const inserted = await tx
          .insert(recipeIngredients)
          .values(
            input.ingredients.map((ing, i) => ({
              recipeId: existing.id,
              position: i + 1,
              foodId: ing.foodId,
              quantityG: ing.quantityG,
              displayText: ing.displayText,
              isOptional: false,
            })),
          )
          .returning({ id: recipeIngredients.id });
        await tx.insert(recipeSteps).values(
          input.steps.map((s, i) => ({
            recipeId: existing.id,
            position: i + 1,
            instruction: s.instruction,
            timerSeconds: s.timerSeconds ?? null,
            ingredientIds: s.ingredientIndexes.flatMap((idx) =>
              inserted[idx] ? [inserted[idx].id] : [],
            ),
          })),
        );
        await rebuildNutrition(tx, existing.id);
      });
      updated++;
    }
    console.log(`Starter recipes: ${created} created, ${updated} updated.`);
  } finally {
    await sql.end();
  }
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
