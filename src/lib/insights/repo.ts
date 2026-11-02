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
