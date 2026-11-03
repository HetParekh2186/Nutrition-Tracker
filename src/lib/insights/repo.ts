import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { loadEntries, targetsFor } from "@/lib/diary/repo";
import { N, NUTRIENT_BY_ID, NUTRIENTS } from "@/lib/nutrition/catalog";
import { summarizeRange, topSources } from "@/lib/nutrition/range";

import type { RangeSummaryDTO, SourcesDTO } from "./types";

export async function getRangeSummary(
  userId: string,
  from: string,
  to: string,
): Promise<RangeSummaryDTO> {
  const [entries, { targets }] = await Promise.all([
    loadEntries(userId, from, to),
    targetsFor(userId),
  ]);
  const summary = summarizeRange(
    from,
    to,
    entries.map((e) => ({ date: e.entryDate, nutrients: e.nutrients })),
  );
  return {
    from,
    to,
    days: summary.days,
    loggedDays: summary.loggedDays,
    averageMacros: summary.averageMacros,
    targetMacros: {
      kcal: targets[N.energy]?.min ?? 0,
      proteinG: targets[N.protein]?.min ?? 0,
      carbsG: targets[N.carbs]?.min ?? 0,
      fatG: targets[N.fat]?.min ?? 0,
      fiberG: targets[N.fiber]?.min ?? 0,
    },
    nutrients: NUTRIENTS.map((n) => ({
      id: n.id,
      name: n.name,
      unit: n.unit,
      category: n.category,
      amount: summary.averages[n.id] ?? null,
      known: summary.coverage[n.id]?.known ?? 0,
      total: entries.length,
      target: targets[n.id] ?? null,
    })),
  };
}

/** "Where does my X come from": top foods for a nutrient over a range. */
export async function getSources(
  userId: string,
  nutrientId: number,
  from: string,
  to: string,
): Promise<SourcesDTO | null> {
  const nutrient = NUTRIENT_BY_ID.get(nutrientId);
  if (!nutrient) return null;
  const entries = await loadEntries(userId, from, to);
  const loggedDays = new Set(entries.map((e) => e.entryDate)).size;
  const sources = topSources(
    entries.map((e) => ({
      key: e.foodId !== null ? `f${e.foodId}` : `r${e.recipeId}`,
      name: e.name,
      nutrients: e.nutrients,
    })),
    nutrientId,
  );
  return {
    nutrientId,
    name: nutrient.name,
    unit: nutrient.unit,
    from,
    to,
    loggedDays,
    sources: sources.map((s) => ({
      ...s,
      dailyAverage: loggedDays > 0 ? s.amount / loggedDays : 0,
    })),
  };
}

export type SuggestionStats = {
  weeks: { weekStart: string; shown: number; acted: number }[];
  shown: number;
  acted: number;
  /** acted / shown, or null when nothing was shown. */
  rate: number | null;
};

/**
 * SPEC.md "Measuring it": the share of top-5 suggestions you saved,
 * cooked or logged within 7 days of first seeing them, per week.
 */
export async function getSuggestionStats(
  userId: string,
  weeks = 4,
): Promise<SuggestionStats> {
  const rows = await getDb().execute<{
    week_start: string;
    shown: number;
    acted: number;
  }>(sql`
    with shown as (
      select recipe_id,
             date_trunc('week', created_at) as week_start,
             min(created_at) as first_at
        from recipe_interactions
       where user_id = ${userId}
         and event = 'impression'
         and created_at >= now() - make_interval(weeks => ${weeks})
       group by recipe_id, date_trunc('week', created_at)
    )
    select to_char(week_start, 'YYYY-MM-DD') as week_start,
           count(*)::int as shown,
           count(*) filter (where exists (
             select 1 from recipe_interactions x
              where x.user_id = ${userId}
                and x.recipe_id = shown.recipe_id
                and x.event in ('save', 'cook_complete', 'log')
                and x.created_at between shown.first_at
                                     and shown.first_at + interval '7 days'
           ))::int as acted
      from shown
     group by week_start
     order by week_start
  `);
  const shown = rows.reduce((s, r) => s + r.shown, 0);
  const acted = rows.reduce((s, r) => s + r.acted, 0);
  return {
    weeks: rows.map((r) => ({
      weekStart: r.week_start,
      shown: r.shown,
      acted: r.acted,
    })),
    shown,
    acted,
    rate: shown ? acted / shown : null,
  };
}
