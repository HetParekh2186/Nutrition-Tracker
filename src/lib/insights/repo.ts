import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { loadEntries, targetsFor } from "@/lib/diary/repo";
import { N, NUTRIENT_BY_ID, NUTRIENTS } from "@/lib/nutrition/catalog";
import { summarizeRange, topSources } from "@/lib/nutrition/range";

import type { ImpactDTO, RangeSummaryDTO, SourcesDTO } from "./types";

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

/**
 * The numbers behind the README's Impact section (SPEC.md "README
 * requirements"), over a date range in the user's timezone.
 */
export async function getImpact(
  userId: string,
  from: string,
  to: string,
): Promise<ImpactDTO> {
  const db = getDb();
  const [timing, dinners, via] = await Promise.all([
    db.execute<{ median_ms: number | null; n: number }>(sql`
      select percentile_cont(0.5) within group (order by log_ms)::float8 as median_ms,
             count(log_ms)::int as n
        from diary_entries
       where user_id = ${userId}
         and entry_date between ${from} and ${to}
         and log_ms is not null
    `),
    db.execute<{ days: number; from_mise: number }>(sql`
      select count(distinct d.entry_date)::int as days,
             count(distinct d.entry_date) filter (where exists (
               select 1 from recipe_interactions i
                where i.user_id = d.user_id
                  and i.recipe_id = d.recipe_id
                  and i.event = 'impression'
                  and i.created_at <= d.created_at
             ))::int as from_mise
        from diary_entries d
       where d.user_id = ${userId}
         and d.meal_slot = 'dinner'
         and d.entry_date between ${from} and ${to}
    `),
    db.execute<{ via: string; count: number }>(sql`
      select logged_via as via, count(*)::int as count
        from diary_entries
       where user_id = ${userId}
         and entry_date between ${from} and ${to}
       group by logged_via
       order by count desc
    `),
  ]);
  const t = timing[0];
  const d = dinners[0];
  return {
    from,
    to,
    medianLogSeconds:
      t?.median_ms === null || t?.median_ms === undefined
        ? null
        : t.median_ms / 1000,
    timedLogs: t?.n ?? 0,
    dinnerDays: d?.days ?? 0,
    dinnerDaysFromMise: d?.from_mise ?? 0,
    loggedVia: via.map((r) => ({ via: r.via, count: r.count })),
  };
}
