// Recipe storage. Users see their own recipes plus shared ones (owner_id
// null, the starter library); they can only change their own.

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import type { RecipeInput } from "@/lib/api/schemas";
import { getDb, type Db } from "@/lib/db";
import type { MealSlot } from "@/lib/db/enums";
import {
  foods,
  recipeIngredients,
  recipeNutrition,
  recipes,
  recipeSteps,
} from "@/lib/db/schema";
import { nutrientMapsFor } from "@/lib/foods/repo";
import { NUTRIENTS } from "@/lib/nutrition/catalog";
import { macrosOf } from "@/lib/nutrition/macros";
import type { NutrientMap } from "@/lib/nutrition/math";

import { recipeNutrition as computeNutrition, scaleQuantity } from "./compute";
import type { RecipeDetailDTO, RecipeSource, RecipeSummaryDTO } from "./types";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export class RecipeNotFoundError extends Error {}

const visibleTo = (userId: string) =>
  or(isNull(recipes.ownerId), eq(recipes.ownerId, userId));

/** Per-serving nutrient maps from the cache. */
async function cachedNutrition(
  recipeIds: string[],
): Promise<Map<string, NutrientMap>> {
  const out = new Map<string, NutrientMap>();
  if (recipeIds.length === 0) return out;
  const rows = await getDb()
    .select()
    .from(recipeNutrition)
    .where(inArray(recipeNutrition.recipeId, recipeIds));
  for (const r of rows) {
    const map = out.get(r.recipeId) ?? {};
    map[r.nutrientId] = r.amountPerServing;
    out.set(r.recipeId, map);
  }
  return out;
}

async function unmatchedCounts(recipeIds: string[]) {
  const out = new Map<string, number>();
  if (recipeIds.length === 0) return out;
  const rows = await getDb()
    .select({
      recipeId: recipeIngredients.recipeId,
      n: sql<number>`count(*)::int`,
    })
    .from(recipeIngredients)
    .where(
      and(
        inArray(recipeIngredients.recipeId, recipeIds),
        isNull(recipeIngredients.foodId),
      ),
    )
    .groupBy(recipeIngredients.recipeId);
  for (const r of rows) out.set(r.recipeId, r.n);
  return out;
}

type RecipeRow = typeof recipes.$inferSelect;

function toSummary(
  r: RecipeRow,
  userId: string,
  nutrition: NutrientMap | undefined,
  unmatched: number,
): RecipeSummaryDTO {
  const { energyEstimated: _e, ...perServing } = macrosOf(nutrition ?? {});
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    cuisine: r.cuisine,
    mealTypes: r.mealTypes as MealSlot[],
    tags: r.tags,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    coverSeed: r.coverSeed,
    source: r.source,
    isOwn: r.ownerId === userId,
    perServing,
    unmatched,
  };
}

export async function summariesFor(
  userId: string,
  rows: RecipeRow[],
): Promise<RecipeSummaryDTO[]> {
  const ids = rows.map((r) => r.id);
  const [nutrition, unmatched] = await Promise.all([
    cachedNutrition(ids),
    unmatchedCounts(ids),
  ]);
  return rows.map((r) =>
    toSummary(r, userId, nutrition.get(r.id), unmatched.get(r.id) ?? 0),
  );
}

export async function listRecipes(
  userId: string,
  options: {
    query?: string | undefined;
    tags?: string[];
    slot?: MealSlot | undefined;
  },
): Promise<RecipeSummaryDTO[]> {
  const filters = [visibleTo(userId)];
  if (options.query?.trim()) {
    const q = `%${options.query.trim()}%`;
    filters.push(or(ilike(recipes.title, q), ilike(recipes.cuisine, q))!);
  }
  if (options.tags?.length) {
    filters.push(sql`${recipes.tags} && ${sql.param(options.tags)}::text[]`);
  }
  if (options.slot) {
    filters.push(sql`${options.slot} = any(${recipes.mealTypes})`);
  }
  const rows = await getDb()
    .select()
    .from(recipes)
    .where(and(...filters))
    // Your own recipes first, newest first; then the shared library.
    .orderBy(sql`(${recipes.ownerId} is null)`, desc(recipes.createdAt))
    .limit(200);
  return summariesFor(userId, rows);
}

export async function getRecipe(
  userId: string,
  id: string,
  viewServings?: number,
): Promise<RecipeDetailDTO | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), visibleTo(userId)))
    .limit(1);
  if (!row) return null;

  const [ingredients, steps, [summary], parent] = await Promise.all([
    db
      .select({ ing: recipeIngredients, foodName: foods.name })
      .from(recipeIngredients)
      .leftJoin(foods, eq(foods.id, recipeIngredients.foodId))
      .where(eq(recipeIngredients.recipeId, id))
      .orderBy(asc(recipeIngredients.position)),
    db
      .select()
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, id))
      .orderBy(asc(recipeSteps.position)),
    summariesFor(userId, [row]),
    row.parentRecipeId
      ? db
          .select({ title: recipes.title })
          .from(recipes)
          .where(eq(recipes.id, row.parentRecipeId))
          .then((r) => r[0] ?? null)
      : null,
  ]);
  const nutrition = (await cachedNutrition([id])).get(id) ?? {};
  const servings = viewServings ?? row.servings;
  const unmatched = summary?.unmatched ?? 0;

  return {
    ...summary!,
    parentRecipeId: row.parentRecipeId,
    parentTitle: parent?.title ?? null,
    viewServings: servings,
    nutrients: NUTRIENTS.map((n) => ({
      id: n.id,
      name: n.name,
      unit: n.unit,
      category: n.category,
      amount: nutrition[n.id] ?? null,
      known: nutrition[n.id] === undefined ? 0 : ingredients.length - unmatched,
      total: ingredients.length,
      target: null,
    })),
    ingredients: ingredients.map(({ ing, foodName }) => ({
      id: ing.id,
      position: ing.position,
      foodId: ing.foodId,
      foodName,
      quantityG: ing.quantityG,
      scaledG: scaleQuantity(ing.quantityG, row.servings, servings),
      displayText: ing.displayText,
      isOptional: ing.isOptional,
      groupLabel: ing.groupLabel,
    })),
    steps: steps.map((s) => ({
      id: s.id,
      position: s.position,
      instruction: s.instruction,
      timerSeconds: s.timerSeconds,
      ingredientIds: s.ingredientIds,
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Rebuild the per-serving nutrition cache from the ingredients. Called
 * after every create or edit, so the cache never drifts from the source.
 */
export async function rebuildNutrition(
  db: Db | Tx,
  recipeId: string,
): Promise<NutrientMap> {
  const [recipe] = await db
    .select({ servings: recipes.servings })
    .from(recipes)
    .where(eq(recipes.id, recipeId));
  if (!recipe) throw new RecipeNotFoundError();
  const ingredients = await db
    .select({
      foodId: recipeIngredients.foodId,
      quantityG: recipeIngredients.quantityG,
    })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId));
  const foodIds = [
    ...new Set(ingredients.flatMap((i) => (i.foodId ? [i.foodId] : []))),
  ];
  const maps = new Map(
    [...(await nutrientMapsFor(foodIds))].map(
      ([id, v]) => [id, v.map] as const,
    ),
  );
  const { perServing } = computeNutrition(ingredients, recipe.servings, maps);
  await db
    .delete(recipeNutrition)
    .where(eq(recipeNutrition.recipeId, recipeId));
  const rows = Object.entries(perServing.amounts).map(([id, amount]) => ({
    recipeId,
    nutrientId: Number(id),
    amountPerServing: amount,
  }));
  if (rows.length) await db.insert(recipeNutrition).values(rows);
  return perServing.amounts;
}

async function writeChildren(tx: Tx, recipeId: string, input: RecipeInput) {
  await tx.delete(recipeSteps).where(eq(recipeSteps.recipeId, recipeId));
  await tx
    .delete(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId));
  const inserted = await tx
    .insert(recipeIngredients)
    .values(
      input.ingredients.map((ing, i) => ({
        recipeId,
        position: i + 1,
        foodId: ing.foodId,
        quantityG: ing.quantityG,
        displayText: ing.displayText,
        isOptional: ing.isOptional,
        groupLabel: ing.groupLabel ?? null,
      })),
    )
    .returning({
      id: recipeIngredients.id,
      position: recipeIngredients.position,
    });
  const idByIndex = new Map(inserted.map((r) => [r.position - 1, r.id]));
  if (input.steps.length) {
    await tx.insert(recipeSteps).values(
      input.steps.map((step, i) => ({
        recipeId,
        position: i + 1,
        instruction: step.instruction,
        timerSeconds: step.timerSeconds ?? null,
        ingredientIds: step.ingredientIndexes.flatMap((idx) => {
          const id = idByIndex.get(idx);
          return id === undefined ? [] : [id];
        }),
      })),
    );
  }
}

export async function createRecipe(
  userId: string | null,
  input: RecipeInput,
  meta: { source: RecipeSource; parentRecipeId?: string | null } = {
    source: "user",
  },
): Promise<string> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(recipes)
      .values({
        ownerId: userId,
        parentRecipeId: meta.parentRecipeId ?? null,
        source: meta.source,
        title: input.title,
        description: input.description ?? null,
        cuisine: input.cuisine ?? null,
        mealTypes: input.mealTypes,
        tags: input.tags,
        servings: input.servings,
        prepMinutes: input.prepMinutes ?? null,
        cookMinutes: input.cookMinutes ?? null,
      })
      .returning({ id: recipes.id });
    if (!row) throw new Error("Insert failed");
    await writeChildren(tx, row.id, input);
    await rebuildNutrition(tx, row.id);
    return row.id;
  });
}

export async function updateRecipe(
  userId: string,
  id: string,
  input: RecipeInput,
): Promise<void> {
  await getDb().transaction(async (tx) => {
    const updated = await tx
      .update(recipes)
      .set({
        title: input.title,
        description: input.description ?? null,
        cuisine: input.cuisine ?? null,
        mealTypes: input.mealTypes,
        tags: input.tags,
        servings: input.servings,
        prepMinutes: input.prepMinutes ?? null,
        cookMinutes: input.cookMinutes ?? null,
      })
      .where(and(eq(recipes.id, id), eq(recipes.ownerId, userId)))
      .returning({ id: recipes.id });
    if (!updated.length) throw new RecipeNotFoundError();
    await writeChildren(tx, id, input);
    await rebuildNutrition(tx, id);
  });
}

export async function deleteRecipe(
  userId: string,
  id: string,
): Promise<boolean> {
  const rows = await getDb()
    .delete(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.ownerId, userId)))
    .returning({ id: recipes.id });
  return rows.length > 0;
}

/** Recipe as an editable input, e.g. to adapt or duplicate it. */
export function toInput(detail: RecipeDetailDTO): RecipeInput {
  const indexById = new Map(detail.ingredients.map((ing, i) => [ing.id, i]));
  return {
    title: detail.title,
    description: detail.description,
    cuisine: detail.cuisine,
    mealTypes: detail.mealTypes,
    tags: detail.tags,
    servings: detail.servings,
    prepMinutes: detail.prepMinutes,
    cookMinutes: detail.cookMinutes,
    ingredients: detail.ingredients.map((ing) => ({
      displayText: ing.displayText,
      foodId: ing.foodId,
      quantityG: ing.quantityG,
      isOptional: ing.isOptional,
      groupLabel: ing.groupLabel,
    })),
    steps: detail.steps.map((s) => ({
      instruction: s.instruction,
      timerSeconds: s.timerSeconds,
      ingredientIndexes: s.ingredientIds.flatMap((id) => {
        const i = indexById.get(id);
        return i === undefined ? [] : [i];
      }),
    })),
  };
}
