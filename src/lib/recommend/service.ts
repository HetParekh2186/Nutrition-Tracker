// The four-step pipeline (SPEC.md "Recommendation engine"):
//   1. candidates in SQL, hard rules never overridden by score
//   2. score each candidate
//   3. diversify the top 30 with MMR
//   4. explain with why-this chips

import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import type { MealSlot } from "@/lib/db/enums";
import { recipes } from "@/lib/db/schema";
import { getDaySummary } from "@/lib/diary/repo";
import { cosine } from "@/lib/embeddings/hash";
import { daysBetween, localDate } from "@/lib/nutrition/dates";
import { getPreferences, getProfile } from "@/lib/profile/repo";
import { expandExclusions, wordStartPattern } from "@/lib/recipes/allergens";
import { dietBreaks } from "@/lib/recipes/diet";
import { summariesFor } from "@/lib/recipes/repo";

import { slotBudget } from "./budget";
import { mmr } from "./diversify";
import { explain } from "./explain";
import { recipeStates, recordImpressions } from "./interactions";
import {
  cuisinePreference,
  dislikePenalty,
  macroFit,
  novelty,
  ratingPrior,
  score,
  tasteSimilarity,
  type Terms,
} from "./score";
import { getTasteProfile } from "./taste-repo";
import type { RecommendationsDTO } from "./types";

type CandidateRow = typeof recipes.$inferSelect & { ingredient_text: string };

/** Step 1: recipes the user may eat, for this slot, within their rules. */
async function candidates(
  userId: string,
  slot: MealSlot,
  prefs: Awaited<ReturnType<typeof getPreferences>>,
): Promise<CandidateRow[]> {
  // Categories expand to their foods: "shellfish" blocks shrimp too.
  const excluded = expandExclusions(prefs.excludedIngredients).map((w) =>
    wordStartPattern(w, "pg"),
  );
  // A literal ARRAY[...] so each pattern is its own bound parameter.
  const patterns = sql`array[${sql.join(
    excluded.map((p) => sql`${p}`),
    sql`, `,
  )}]::text[]`;
  const rows = await getDb().execute<Record<string, unknown>>(sql`
    select r.*,
           coalesce((select string_agg(ri.display_text || ' ' || coalesce(f.name, ''), ' | ')
                       from recipe_ingredients ri
                       left join foods f on f.id = ri.food_id
                      where ri.recipe_id = r.id), '') as ingredient_text
      from recipes r
     where (r.owner_id is null or r.owner_id = ${userId})
       and ${slot} = any(r.meal_types)
       and exists (select 1 from recipe_nutrition rn where rn.recipe_id = r.id)
       ${
         prefs.maxCookMinutes
           ? sql`and coalesce(r.prep_minutes, 0) + coalesce(r.cook_minutes, 0) <= ${prefs.maxCookMinutes}`
           : sql``
       }
       ${
         excluded.length
           ? sql`and not exists (
               select 1 from recipe_ingredients ri
               left join foods f on f.id = ri.food_id
              where ri.recipe_id = r.id
                and (ri.display_text ~* any(${patterns})
                     or coalesce(f.name, '') ~* any(${patterns})))`
           : sql``
       }
  `);
  // The diet is read from the ingredients themselves (display text and USDA
  // names), so it holds for recipes tagged before a rule existed.
  const allowed = rows.filter(
    (r) =>
      dietBreaks([r.title as string, r.ingredient_text as string], prefs.eats)
        .length === 0,
  );
  // Map snake_case columns back to the schema's camelCase shape.
  return allowed.map((r) => ({
    id: r.id as string,
    ownerId: (r.owner_id as string | null) ?? null,
    parentRecipeId: (r.parent_recipe_id as string | null) ?? null,
    source: r.source as CandidateRow["source"],
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    cuisine: (r.cuisine as string | null) ?? null,
    mealTypes: r.meal_types as string[],
    tags: r.tags as string[],
    servings: Number(r.servings),
    prepMinutes: (r.prep_minutes as number | null) ?? null,
    cookMinutes: (r.cook_minutes as number | null) ?? null,
    coverSeed: r.cover_seed as number,
    embedding: parseVector(r.embedding),
    createdAt: new Date(r.created_at as string),
    ingredient_text: r.ingredient_text as string,
  }));
}

function parseVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string" && v.startsWith("["))
    return JSON.parse(v) as number[];
  return null;
}

export async function getRecommendations(
  userId: string,
  slot: MealSlot,
  limit = 10,
  options: { logImpressions?: boolean } = {},
): Promise<RecommendationsDTO> {
  const [profile, prefs, taste] = await Promise.all([
    getProfile(userId),
    getPreferences(userId),
    getTasteProfile(userId),
  ]);
  const date = localDate(new Date(), profile.timezone);
  const summary = await getDaySummary(userId, date);
  const budget = slotBudget(summary.remaining, slot);

  const rows = await candidates(userId, slot, prefs);
  const [summaries, states] = await Promise.all([
    summariesFor(userId, rows),
    recipeStates(
      userId,
      rows.map((r) => r.id),
    ),
  ]);
  const summaryById = new Map(summaries.map((s) => [s.id, s]));
  const tasteVector = taste?.tasteEmbedding ?? null;
  const learned = taste?.cuisineWeights ?? {};
  const disliked = prefs.dislikedIngredients.map(
    (d) => new RegExp(`\\b${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
  );

  // Recipes cooked at least twice, for "Like the X you cooked twice".
  const favourites = rows.filter(
    (r) => (states.get(r.id)?.cookCount ?? 0) >= 2,
  );

  // "Not for me" hides a recipe for two weeks; the skip also teaches taste.
  const SKIP_DAYS = 14;
  const eligible = rows.filter((r) => {
    const skipped = states.get(r.id)?.lastSkippedAt;
    return !skipped || Date.now() - skipped.getTime() > SKIP_DAYS * 86_400_000;
  });

  // Step 2: score.
  const scored = eligible.map((r) => {
    const s = summaryById.get(r.id)!;
    const state = states.get(r.id);
    const daysSince = state?.lastCookedAt
      ? daysBetween(localDate(state.lastCookedAt, profile.timezone), date)
      : null;
    const terms: Terms = {
      M: macroFit(s.perServing, budget),
      T: tasteSimilarity(
        tasteVector && r.embedding ? cosine(tasteVector, r.embedding) : null,
      ),
      C: cuisinePreference(r.cuisine, prefs.likedCuisines, learned),
      N: novelty(daysSince),
      R: ratingPrior(state?.rating ?? null),
      D: dislikePenalty(
        disliked.filter((re) => re.test(r.ingredient_text)).length,
      ),
    };
    return { row: r, summary: s, state, daysSince, terms, score: score(terms) };
  });

  // Step 3: diversify.
  const ranked = mmr(
    scored.map((s) => ({
      ...s,
      id: s.row.id,
      embedding: s.row.embedding,
      cuisine: s.row.cuisine,
    })),
    limit,
  );

  // The taste chip is relative: top quarter of this list's taste scores.
  const tasteScores = scored.map((s) => s.terms.T).sort((a, b) => b - a);
  const tasteCutoff =
    tasteScores[Math.max(0, Math.floor(tasteScores.length / 4) - 1)] ?? 1;

  // Step 4: explain.
  const items = ranked.map((s) => {
    const similar = favourites
      .filter((f) => f.id !== s.row.id && f.embedding && s.row.embedding)
      .map((f) => ({ f, sim: cosine(f.embedding!, s.row.embedding!) }))
      .sort((a, b) => b.sim - a.sim)[0];
    const reasons = explain(s.terms, {
      slot,
      budget,
      serving: s.summary.perServing,
      cuisine: s.row.cuisine,
      likedCuisine: prefs.likedCuisines
        .map((c) => c.toLowerCase())
        .includes((s.row.cuisine ?? "").toLowerCase()),
      daysSinceCooked: s.daysSince,
      strongTaste: tasteVector !== null && s.terms.T >= tasteCutoff,
      rating: s.state?.rating ?? null,
      similarCooked:
        similar && similar.sim > 0.75
          ? {
              title: similar.f.title,
              count: states.get(similar.f.id)?.cookCount ?? 0,
            }
          : null,
    });
    return {
      recipe: s.summary,
      score: Number(s.score.toFixed(3)),
      breakdown: Object.fromEntries(
        Object.entries(s.terms).map(([k, v]) => [k, Number(v.toFixed(3))]),
      ) as Terms,
      reasons,
      saved: s.state?.saved ?? false,
    };
  });

  if (options.logImpressions !== false) {
    // SPEC.md measures the save-or-cook rate of the top 5 suggestions.
    await recordImpressions(
      userId,
      items.slice(0, 5).map((i) => i.recipe.id),
    );
  }
  return { slot, date, budget, personalized: tasteVector !== null, items };
}
