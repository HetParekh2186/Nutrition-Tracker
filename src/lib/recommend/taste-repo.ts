// Rebuilds taste_profiles (SPEC.md: nightly and after each completed
// cook). Signals: recipe cooks, logs, saves, ratings and skips, plus one
// embedded text per meal slot per day for everyday (non-recipe) meals.

import { and, eq, gte, isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  diaryEntries,
  foods,
  recipeInteractions,
  recipes,
  tasteProfiles,
  users,
} from "@/lib/db/schema";
import { embedTexts, mealText } from "@/lib/embeddings";
import { getTimezone } from "@/lib/diary/repo";
import { daysBetween, localDate } from "@/lib/nutrition/dates";

import {
  applyColdStart,
  cuisineWeights,
  tasteEmbedding,
  type TasteSignal,
  type WeightedEvent,
} from "./taste";

const LOOKBACK_DAYS = 120;
const MEAL_LOOKBACK_DAYS = 60;

export async function rebuildTasteProfile(userId: string): Promise<void> {
  const db = getDb();
  const timezone = await getTimezone(userId);
  const today = localDate(new Date(), timezone);
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);

  // Recipe signals. Only the latest save/unsave and rating per recipe count.
  const rows = await db
    .select({
      recipeId: recipeInteractions.recipeId,
      event: recipeInteractions.event,
      rating: recipeInteractions.rating,
      createdAt: recipeInteractions.createdAt,
      embedding: recipes.embedding,
      cuisine: recipes.cuisine,
    })
    .from(recipeInteractions)
    .innerJoin(recipes, eq(recipes.id, recipeInteractions.recipeId))
    .where(
      and(
        eq(recipeInteractions.userId, userId),
        gte(recipeInteractions.createdAt, since),
        sql`${recipeInteractions.event} in ('cook_complete','log','save','unsave','rate','skip')`,
      ),
    )
    .orderBy(sql`${recipeInteractions.createdAt} desc`);

  const events: WeightedEvent[] = [];
  const latestSave = new Set<string>();
  const latestRate = new Set<string>();
  for (const r of rows) {
    const daysAgo = daysBetween(localDate(r.createdAt, timezone), today);
    if (r.event === "save" || r.event === "unsave") {
      if (latestSave.has(r.recipeId)) continue;
      latestSave.add(r.recipeId);
      if (r.event === "unsave") continue;
    }
    if (r.event === "rate") {
      if (latestRate.has(r.recipeId)) continue;
      latestRate.add(r.recipeId);
    }
    events.push({
      signal: r.event as TasteSignal,
      rating: r.rating,
      daysAgo,
      embedding: r.embedding,
      cuisine: r.cuisine,
    });
  }

  // Everyday meals: "lunch: chicken breast, basmati rice, greek yogurt".
  const mealSince = localDate(
    new Date(Date.now() - MEAL_LOOKBACK_DAYS * 86_400_000),
    timezone,
  );
  const meals = await db
    .select({
      date: diaryEntries.entryDate,
      slot: diaryEntries.mealSlot,
      names: sql<
        string[]
      >`array_agg(split_part(${foods.name}, ',', 1) order by ${diaryEntries.createdAt})`,
    })
    .from(diaryEntries)
    .innerJoin(foods, eq(foods.id, diaryEntries.foodId))
    .where(
      and(
        eq(diaryEntries.userId, userId),
        gte(diaryEntries.entryDate, mealSince),
        isNotNull(diaryEntries.foodId),
      ),
    )
    .groupBy(diaryEntries.entryDate, diaryEntries.mealSlot);
  const mealVectors = await embedTexts(
    meals.map((m) => mealText(m.slot, [...new Set(m.names)])),
  );
  meals.forEach((m, i) =>
    events.push({
      signal: "meal",
      daysAgo: daysBetween(m.date, today),
      embedding: mealVectors[i] ?? null,
    }),
  );

  // Most-eaten foods over the same window.
  const top = await db
    .select({
      foodId: foods.id,
      name: foods.name,
      count: sql<number>`count(*)::int`,
    })
    .from(diaryEntries)
    .innerJoin(foods, eq(foods.id, diaryEntries.foodId))
    .where(
      and(
        eq(diaryEntries.userId, userId),
        gte(diaryEntries.entryDate, mealSince),
      ),
    )
    .groupBy(foods.id, foods.name)
    .orderBy(sql`count(*) desc`)
    .limit(15);

  const withColdStart = applyColdStart(events);
  const values = {
    tasteEmbedding: tasteEmbedding(withColdStart),
    cuisineWeights: cuisineWeights(withColdStart),
    topIngredients: top.map((t) => ({
      foodId: t.foodId,
      name: t.name,
      count: t.count,
    })),
    mealTimePatterns: {},
    rebuiltAt: new Date(),
  };
  await db
    .insert(tasteProfiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: tasteProfiles.userId, set: values });
}

/** Nightly job: every user who has done anything. */
export async function rebuildAllTasteProfiles(): Promise<number> {
  const ids = await getDb().select({ id: users.id }).from(users);
  for (const { id } of ids) await rebuildTasteProfile(id);
  return ids.length;
}

export async function getTasteProfile(userId: string) {
  const [row] = await getDb()
    .select()
    .from(tasteProfiles)
    .where(eq(tasteProfiles.userId, userId));
  return row ?? null;
}
