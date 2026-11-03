// Keeps recipe embeddings filled in. Called after every recipe save and by
// the backfill script.

import { asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { foods, recipeIngredients, recipes } from "@/lib/db/schema";
import { embedTexts, recipeText } from "@/lib/embeddings";

export async function embedRecipes(
  options: { ids?: string[]; all?: boolean } = {},
): Promise<number> {
  const db = getDb();
  const where = options.ids
    ? inArray(recipes.id, options.ids)
    : options.all
      ? sql`true`
      : isNull(recipes.embedding);
  const rows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      cuisine: recipes.cuisine,
      mealTypes: recipes.mealTypes,
      description: recipes.description,
    })
    .from(recipes)
    .where(where);
  if (rows.length === 0) return 0;

  const ingredients = await db
    .select({
      recipeId: recipeIngredients.recipeId,
      text: recipeIngredients.displayText,
      food: foods.name,
    })
    .from(recipeIngredients)
    .leftJoin(foods, eq(foods.id, recipeIngredients.foodId))
    .where(
      inArray(
        recipeIngredients.recipeId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(recipeIngredients.position));
  const byRecipe = new Map<string, string[]>();
  for (const i of ingredients) {
    const list = byRecipe.get(i.recipeId) ?? [];
    // The USDA name's first part ("Chicken", "Rice") is the useful signal.
    list.push(i.food ? i.food.split(",").slice(0, 2).join(" ") : i.text);
    byRecipe.set(i.recipeId, list);
  }

  const vectors = await embedTexts(
    rows.map((r) =>
      recipeText({ ...r, ingredients: byRecipe.get(r.id) ?? [] }),
    ),
  );
  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      await tx
        .update(recipes)
        .set({ embedding: vectors[i]! })
        .where(eq(recipes.id, rows[i]!.id));
    }
  });
  return rows.length;
}
