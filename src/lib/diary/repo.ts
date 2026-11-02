// Diary queries. Every function takes the user id and filters by it; the
// app connects as a role that bypasses RLS, so this is the access control.

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  diaryEntries,
  foods,
  MEAL_SLOTS,
  nutrientTargets,
  recipeNutrition,
  recipes,
  userProfiles,
  type LoggedVia,
  type MealSlot,
} from "@/lib/db/schema";
import { nutrientMapsFor } from "@/lib/foods/repo";
import { NUTRIENTS, N } from "@/lib/nutrition/catalog";
import {
  FALLBACK_TARGETS,
  type TargetRange,
} from "@/lib/nutrition/fallback-targets";
import { macrosOf, subtractMacros } from "@/lib/nutrition/macros";
import { sumNutrients, type NutrientMap } from "@/lib/nutrition/math";

import { entryNutrients } from "./compute";
import type {
  DaySummaryDTO,
  DiaryDayDTO,
  DiaryEntryDTO,
  NutrientRowDTO,
} from "./types";

export async function getTimezone(userId: string): Promise<string> {
  const [row] = await getDb()
    .select({ timezone: userProfiles.timezone })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return row?.timezone ?? "America/Chicago";
}

async function recipeMapsFor(
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

type LoadedEntry = DiaryEntryDTO & { nutrients: NutrientMap };

/** Entries for a day with their nutrients computed. */
async function loadEntries(
  userId: string,
  date: string,
): Promise<LoadedEntry[]> {
  const rows = await getDb()
    .select({
      entry: diaryEntries,
      foodName: foods.name,
      foodBrand: foods.brand,
      recipeTitle: recipes.title,
    })
    .from(diaryEntries)
    .leftJoin(foods, eq(foods.id, diaryEntries.foodId))
    .leftJoin(recipes, eq(recipes.id, diaryEntries.recipeId))
    .where(
      and(eq(diaryEntries.userId, userId), eq(diaryEntries.entryDate, date)),
    )
    .orderBy(asc(diaryEntries.createdAt), asc(diaryEntries.id));

  const foodIds = [
    ...new Set(rows.flatMap((r) => (r.entry.foodId ? [r.entry.foodId] : []))),
  ];
  const recipeIds = [
    ...new Set(
      rows.flatMap((r) => (r.entry.recipeId ? [r.entry.recipeId] : [])),
    ),
  ];
  const [foodInfo, recipeMaps] = await Promise.all([
    nutrientMapsFor(foodIds),
    recipeMapsFor(recipeIds),
  ]);
  const foodMaps = new Map(
    [...foodInfo].map(([id, info]) => [id, info.map] as const),
  );

  return rows.map(({ entry, foodName, foodBrand, recipeTitle }) => {
    const nutrients = entryNutrients(entry, foodMaps, recipeMaps);
    const { energyEstimated, ...macros } = macrosOf(nutrients);
    return {
      id: entry.id,
      entryDate: entry.entryDate,
      mealSlot: entry.mealSlot,
      kind: entry.foodId !== null ? "food" : "recipe",
      foodId: entry.foodId,
      recipeId: entry.recipeId,
      name: foodName ?? recipeTitle ?? "Unknown item",
      brand: foodBrand ?? null,
      quantityG: entry.quantityG,
      servings: entry.servings,
      portionLabel: entry.portionLabel,
      loggedVia: entry.loggedVia,
      createdAt: entry.createdAt.toISOString(),
      macros,
      energyEstimated:
        energyEstimated ||
        (entry.foodId !== null &&
          (foodInfo.get(entry.foodId)?.energyEstimated ?? false)),
      nutrients,
    };
  });
}

export async function getDiaryDay(
  userId: string,
  date: string,
): Promise<DiaryDayDTO> {
  const entries = await loadEntries(userId, date);
  const slots = Object.fromEntries(
    MEAL_SLOTS.map((s) => [s, [] as DiaryEntryDTO[]]),
  ) as Record<MealSlot, DiaryEntryDTO[]>;
  for (const { nutrients: _omit, ...entry } of entries) {
    slots[entry.mealSlot].push(entry);
  }
  return { date, slots };
}

async function targetsFor(
  userId: string,
): Promise<{ targets: Record<number, TargetRange>; defaults: boolean }> {
  const rows = await getDb()
    .select()
    .from(nutrientTargets)
    .where(eq(nutrientTargets.userId, userId));
  if (rows.length === 0) return { targets: FALLBACK_TARGETS, defaults: true };
  const targets: Record<number, TargetRange> = {};
  for (const r of rows) {
    targets[r.nutrientId] = { min: r.minAmount, max: r.maxAmount };
  }
  return { targets, defaults: false };
}

export async function getDaySummary(
  userId: string,
  date: string,
): Promise<DaySummaryDTO> {
  const [entries, timezone, { targets, defaults }] = await Promise.all([
    loadEntries(userId, date),
    getTimezone(userId),
    targetsFor(userId),
  ]);
  const totals = sumNutrients(entries.map((e) => e.nutrients));
  const { energyEstimated, ...consumed } = macrosOf(totals.amounts);
  const target = {
    kcal: targets[N.energy]?.min ?? 0,
    proteinG: targets[N.protein]?.min ?? 0,
    carbsG: targets[N.carbs]?.min ?? 0,
    fatG: targets[N.fat]?.min ?? 0,
    fiberG: targets[N.fiber]?.min ?? 0,
  };
  const nutrients: NutrientRowDTO[] = NUTRIENTS.map((n) => ({
    id: n.id,
    name: n.name,
    unit: n.unit,
    category: n.category,
    amount: totals.amounts[n.id] ?? null,
    known: totals.coverage[n.id]?.known ?? 0,
    total: totals.itemCount,
    target: targets[n.id] ?? null,
  }));
  return {
    date,
    timezone,
    entryCount: entries.length,
    consumed,
    target,
    remaining: subtractMacros(target, consumed),
    energyEstimated: energyEstimated || entries.some((e) => e.energyEstimated),
    targetsAreDefaults: defaults,
    nutrients,
  };
}

export type NewEntry =
  | {
      kind: "food";
      foodId: number;
      quantityG: number;
      portionLabel?: string | null | undefined;
    }
  | { kind: "recipe"; recipeId: string; servings: number };

/** Throws if the food or recipe is not visible to the user. */
async function assertVisible(userId: string, item: NewEntry): Promise<void> {
  const db = getDb();
  if (item.kind === "food") {
    const [row] = await db
      .select({ id: foods.id })
      .from(foods)
      .where(
        and(
          eq(foods.id, item.foodId),
          or(isNull(foods.ownerId), eq(foods.ownerId, userId)),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundError("Food not found");
  } else {
    const [row] = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(
        and(
          eq(recipes.id, item.recipeId),
          or(isNull(recipes.ownerId), eq(recipes.ownerId, userId)),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundError("Recipe not found");
  }
}

export class NotFoundError extends Error {}

export async function addEntry(
  userId: string,
  input: {
    date: string;
    mealSlot: MealSlot;
    loggedVia: LoggedVia;
    cookSessionId?: string | undefined;
    item: NewEntry;
  },
): Promise<number> {
  await assertVisible(userId, input.item);
  const base = {
    userId,
    entryDate: input.date,
    mealSlot: input.mealSlot,
    loggedVia: input.loggedVia,
    cookSessionId: input.cookSessionId ?? null,
  };
  const values =
    input.item.kind === "food"
      ? {
          ...base,
          foodId: input.item.foodId,
          quantityG: input.item.quantityG,
          portionLabel: input.item.portionLabel ?? null,
        }
      : {
          ...base,
          recipeId: input.item.recipeId,
          servings: input.item.servings,
        };
  const [row] = await getDb()
    .insert(diaryEntries)
    .values(values)
    .returning({ id: diaryEntries.id });
  if (!row) throw new Error("Insert failed");
  return row.id;
}

export async function updateEntry(
  userId: string,
  id: number,
  patch: {
    mealSlot?: MealSlot | undefined;
    quantityG?: number | undefined;
    servings?: number | undefined;
    portionLabel?: string | null | undefined;
    date?: string | undefined;
  },
): Promise<boolean> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, userId)))
    .limit(1);
  if (!existing) return false;
  const set: Partial<typeof diaryEntries.$inferInsert> = {};
  if (patch.mealSlot) set.mealSlot = patch.mealSlot;
  if (patch.date) set.entryDate = patch.date;
  // Keep the food-or-recipe check valid: grams only for foods, servings only
  // for recipes.
  if (patch.quantityG !== undefined && existing.foodId !== null) {
    set.quantityG = patch.quantityG;
    set.portionLabel = patch.portionLabel ?? null;
  }
  if (patch.servings !== undefined && existing.recipeId !== null) {
    set.servings = patch.servings;
  }
  if (Object.keys(set).length === 0) return true;
  await db
    .update(diaryEntries)
    .set(set)
    .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, userId)));
  return true;
}

export async function deleteEntry(
  userId: string,
  id: number,
): Promise<boolean> {
  const rows = await getDb()
    .delete(diaryEntries)
    .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, userId)))
    .returning({ id: diaryEntries.id });
  return rows.length > 0;
}

/** Copy a day, or one slot of it, to another date. Returns rows copied. */
export async function copyEntries(
  userId: string,
  from: string,
  to: string,
  slot?: MealSlot,
  toSlot?: MealSlot,
): Promise<number> {
  const slotFilter = slot ? sql`and meal_slot = ${slot}` : sql``;
  const targetSlot = toSlot ? sql`${toSlot}` : sql`meal_slot`;
  const rows = await getDb().execute<{ id: number }>(sql`
    insert into diary_entries
      (user_id, entry_date, meal_slot, food_id, recipe_id, quantity_g,
       servings, portion_label, logged_via)
    select user_id, ${to}::date, ${targetSlot}, food_id, recipe_id, quantity_g,
           servings, portion_label, 'copy'
      from diary_entries
     where user_id = ${userId} and entry_date = ${from}::date ${slotFilter}
     order by created_at, id
    returning id
  `);
  return rows.length;
}
