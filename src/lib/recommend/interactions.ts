// recipe_interactions: every impression, view, save, skip, rating, cook
// and log (SPEC.md "Measuring it").

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import type { InteractionEvent } from "@/lib/db/enums";
import { recipeInteractions } from "@/lib/db/schema";

export async function recordInteraction(
  userId: string,
  recipeId: string,
  event: InteractionEvent,
  rating?: number | null,
): Promise<void> {
  await getDb()
    .insert(recipeInteractions)
    .values({ userId, recipeId, event, rating: rating ?? null });
}

export async function recordImpressions(
  userId: string,
  recipeIds: string[],
): Promise<void> {
  if (recipeIds.length === 0) return;
  await getDb()
    .insert(recipeInteractions)
    .values(
      recipeIds.map((recipeId) => ({
        userId,
        recipeId,
        event: "impression" as const,
      })),
    );
}

export type RecipeUserState = {
  saved: boolean;
  rating: number | null;
  cookCount: number;
  lastCookedAt: Date | null;
  lastSkippedAt: Date | null;
};

/**
 * Per-recipe state for one user: saved (latest save or unsave wins),
 * latest rating, and how often and how recently it was cooked or logged.
 */
export async function recipeStates(
  userId: string,
  recipeIds: string[],
): Promise<Map<string, RecipeUserState>> {
  const out = new Map<string, RecipeUserState>();
  if (recipeIds.length === 0) return out;
  const rows = await getDb()
    .select({
      recipeId: recipeInteractions.recipeId,
      event: recipeInteractions.event,
      rating: recipeInteractions.rating,
      createdAt: recipeInteractions.createdAt,
    })
    .from(recipeInteractions)
    .where(
      and(
        eq(recipeInteractions.userId, userId),
        inArray(recipeInteractions.recipeId, recipeIds),
        sql`${recipeInteractions.event} <> 'impression'`,
      ),
    )
    .orderBy(desc(recipeInteractions.createdAt));
  for (const id of recipeIds) {
    out.set(id, {
      saved: false,
      rating: null,
      cookCount: 0,
      lastCookedAt: null,
      lastSkippedAt: null,
    });
  }
  const savedDecided = new Set<string>();
  for (const r of rows) {
    const s = out.get(r.recipeId)!;
    if (
      (r.event === "save" || r.event === "unsave") &&
      !savedDecided.has(r.recipeId)
    ) {
      s.saved = r.event === "save";
      savedDecided.add(r.recipeId);
    }
    if (r.event === "rate" && s.rating === null) s.rating = r.rating;
    if (r.event === "skip" && !s.lastSkippedAt) s.lastSkippedAt = r.createdAt;
    if (r.event === "cook_complete" || r.event === "log") {
      s.cookCount += 1;
      if (!s.lastCookedAt || r.createdAt > s.lastCookedAt)
        s.lastCookedAt = r.createdAt;
    }
  }
  return out;
}
