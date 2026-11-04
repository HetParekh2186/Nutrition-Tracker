// Saved meals: named groups of foods and recipes the user logs together.
// Every function takes the user id and filters by it (see diary/repo.ts).

import { and, asc, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  diaryEntries,
  foods,
  mealItems,
  meals,
  recipes,
  type MealSlot,
} from "@/lib/db/schema";
import { entryNutrients } from "@/lib/diary/compute";
import { NotFoundError, recipeMapsFor } from "@/lib/diary/repo";
import { nutrientMapsFor } from "@/lib/foods/repo";
import { addMacros, macrosOf, ZERO_MACROS } from "@/lib/nutrition/macros";
import { recordInteraction } from "@/lib/recommend/interactions";

import type { MealDTO, MealItemDTO } from "./types";

export type MealItemInput =
  | {
      kind: "food";
      foodId: number;
      quantityG: number;
      portionLabel?: string | null | undefined;
    }
  | { kind: "recipe"; recipeId: string; servings: number };

export type MealInput = { name: string; items: MealItemInput[] };

async function hydrate(
  rows: (typeof meals.$inferSelect)[],
): Promise<MealDTO[]> {
  if (rows.length === 0) return [];
  const items = await getDb()
    .select({
      item: mealItems,
      foodName: foods.name,
      foodBrand: foods.brand,
      recipeTitle: recipes.title,
    })
    .from(mealItems)
    .leftJoin(foods, eq(foods.id, mealItems.foodId))
    .leftJoin(recipes, eq(recipes.id, mealItems.recipeId))
    .where(
      inArray(
        mealItems.mealId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(mealItems.position), asc(mealItems.id));

  const foodIds = [...new Set(items.flatMap((r) => r.item.foodId ?? []))];
  const recipeIds = [...new Set(items.flatMap((r) => r.item.recipeId ?? []))];
  const [foodInfo, recipeMaps] = await Promise.all([
    nutrientMapsFor(foodIds),
    recipeMapsFor(recipeIds),
  ]);
  const foodMaps = new Map(
    [...foodInfo].map(([id, info]) => [id, info.map] as const),
  );

  const byMeal = new Map<string, MealItemDTO[]>();
  for (const { item, foodName, foodBrand, recipeTitle } of items) {
    const { energyEstimated: _estimated, ...macros } = macrosOf(
      entryNutrients(item, foodMaps, recipeMaps),
    );
    const list = byMeal.get(item.mealId) ?? [];
    list.push({
      kind: item.foodId !== null ? "food" : "recipe",
      foodId: item.foodId,
      recipeId: item.recipeId,
      name: foodName ?? recipeTitle ?? "Unknown item",
      brand: foodBrand ?? null,
      quantityG: item.quantityG,
      portionLabel: item.portionLabel,
      servings: item.servings,
      macros,
    });
    byMeal.set(item.mealId, list);
  }

  return rows.map((m) => {
    const list = byMeal.get(m.id) ?? [];
    return {
      id: m.id,
      name: m.name,
      items: list,
      macros: list.reduce((sum, i) => addMacros(sum, i.macros), ZERO_MACROS),
      updatedAt: m.updatedAt.toISOString(),
    };
  });
}

/** The user's saved meals, most recently changed first. */
export async function listMeals(
  userId: string,
  query?: string,
): Promise<MealDTO[]> {
  const filters = [eq(meals.ownerId, userId)];
  if (query?.trim()) filters.push(ilike(meals.name, `%${query.trim()}%`));
  const rows = await getDb()
    .select()
    .from(meals)
    .where(and(...filters))
    .orderBy(desc(meals.updatedAt))
    .limit(200);
  return hydrate(rows);
}

export async function getMeal(
  userId: string,
  id: string,
): Promise<MealDTO | null> {
  const rows = await getDb()
    .select()
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.ownerId, userId)))
    .limit(1);
  return (await hydrate(rows))[0] ?? null;
}

/** Throws unless every food and recipe in the meal is visible to the user. */
async function assertItemsVisible(userId: string, items: MealItemInput[]) {
  const db = getDb();
  const foodIds = [
    ...new Set(items.flatMap((i) => (i.kind === "food" ? [i.foodId] : []))),
  ];
  const recipeIds = [
    ...new Set(items.flatMap((i) => (i.kind === "recipe" ? [i.recipeId] : []))),
  ];
  if (foodIds.length) {
    const found = await db
      .select({ id: foods.id })
      .from(foods)
      .where(
        and(
          inArray(foods.id, foodIds),
          or(isNull(foods.ownerId), eq(foods.ownerId, userId)),
        ),
      );
    if (found.length !== foodIds.length) {
      throw new NotFoundError("Food not found");
    }
  }
  if (recipeIds.length) {
    const found = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(
        and(
          inArray(recipes.id, recipeIds),
          or(isNull(recipes.ownerId), eq(recipes.ownerId, userId)),
        ),
      );
    if (found.length !== recipeIds.length) {
      throw new NotFoundError("Recipe not found");
    }
  }
}

function itemRows(mealId: string, items: MealItemInput[]) {
  return items.map((item, position) =>
    item.kind === "food"
      ? {
          mealId,
          position,
          foodId: item.foodId,
          quantityG: item.quantityG,
          portionLabel: item.portionLabel ?? null,
        }
      : {
          mealId,
          position,
          recipeId: item.recipeId,
          servings: item.servings,
        },
  );
}

export async function createMeal(
  userId: string,
  input: MealInput,
): Promise<string> {
  await assertItemsVisible(userId, input.items);
  return getDb().transaction(async (tx) => {
    const [meal] = await tx
      .insert(meals)
      .values({ ownerId: userId, name: input.name })
      .returning({ id: meals.id });
    if (!meal) throw new Error("Insert failed");
    await tx.insert(mealItems).values(itemRows(meal.id, input.items));
    return meal.id;
  });
}

/** Replace a meal's name and items. False when it is not the user's. */
export async function updateMeal(
  userId: string,
  id: string,
  input: MealInput,
): Promise<boolean> {
  await assertItemsVisible(userId, input.items);
  return getDb().transaction(async (tx) => {
    const updated = await tx
      .update(meals)
      .set({ name: input.name, updatedAt: new Date() })
      .where(and(eq(meals.id, id), eq(meals.ownerId, userId)))
      .returning({ id: meals.id });
    if (updated.length === 0) return false;
    await tx.delete(mealItems).where(eq(mealItems.mealId, id));
    await tx.insert(mealItems).values(itemRows(id, input.items));
    return true;
  });
}

export async function deleteMeal(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(meals)
    .where(and(eq(meals.id, id), eq(meals.ownerId, userId)))
    .returning({ id: meals.id });
  return rows.length > 0;
}

/**
 * Log every item of a meal into one slot, scaled by `scale` (2 logs a
 * double portion). Returns the new diary entry ids in meal order, or null
 * when the meal is not the user's.
 */
export async function logMeal(
  userId: string,
  id: string,
  input: { date: string; mealSlot: MealSlot; scale: number },
): Promise<number[] | null> {
  const db = getDb();
  const [meal] = await db
    .select({ id: meals.id })
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.ownerId, userId)))
    .limit(1);
  if (!meal) return null;
  const items = await db
    .select()
    .from(mealItems)
    .where(eq(mealItems.mealId, id))
    .orderBy(asc(mealItems.position), asc(mealItems.id));
  if (items.length === 0) return [];

  const base = {
    userId,
    entryDate: input.date,
    mealSlot: input.mealSlot,
    loggedVia: "meal" as const,
  };
  const rows = await db
    .insert(diaryEntries)
    .values(
      items.map((item) =>
        item.foodId !== null
          ? {
              ...base,
              foodId: item.foodId,
              quantityG: item.quantityG! * input.scale,
              // A label like "2 × 1 large" is wrong once the amount scales.
              portionLabel: input.scale === 1 ? item.portionLabel : null,
            }
          : {
              ...base,
              recipeId: item.recipeId,
              servings: item.servings! * input.scale,
            },
      ),
    )
    .returning({ id: diaryEntries.id });
  // Logging a recipe is a taste signal, as it is from Quick Log.
  for (const recipeId of new Set(items.flatMap((i) => i.recipeId ?? []))) {
    await recordInteraction(userId, recipeId, "log");
  }
  return rows.map((r) => r.id);
}
