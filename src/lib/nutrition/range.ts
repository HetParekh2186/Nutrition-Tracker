// Multi-day aggregation for Insights. Averages are over days with at least
// one entry, so an unlogged day does not read as a day of eating nothing.

import { addDays, daysBetween } from "./dates";
import { macrosOf, ZERO_MACROS, type Macros } from "./macros";
import { sumNutrients, type NutrientMap } from "./math";

export type DayItems = { date: string; items: NutrientMap[] };

export type DayTotal = {
  date: string;
  entryCount: number;
  macros: Macros;
};

export type RangeSummary = {
  days: DayTotal[];
  loggedDays: number;
  /** Mean daily amount per nutrient over logged days. */
  averages: NutrientMap;
  averageMacros: Macros;
  /** Items with data for each nutrient, out of all items in the range. */
  coverage: Record<number, { known: number; total: number }>;
};

/** Every date from `from` to `to`, inclusive. */
export function datesBetween(from: string, to: string): string[] {
  const n = daysBetween(from, to);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

export function summarizeRange(
  from: string,
  to: string,
  entries: { date: string; nutrients: NutrientMap }[],
): RangeSummary {
  const byDate = new Map<string, NutrientMap[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e.nutrients);
    byDate.set(e.date, list);
  }

  const dayTotals: NutrientMap[] = [];
  const days: DayTotal[] = datesBetween(from, to).map((date) => {
    const items = byDate.get(date) ?? [];
    if (items.length === 0) return { date, entryCount: 0, macros: ZERO_MACROS };
    const totals = sumNutrients(items).amounts;
    dayTotals.push(totals);
    const { energyEstimated: _e, ...macros } = macrosOf(totals);
    return { date, entryCount: items.length, macros };
  });

  const loggedDays = dayTotals.length;
  const sums = sumNutrients(dayTotals).amounts;
  const averages: NutrientMap = {};
  for (const [id, total] of Object.entries(sums)) {
    averages[Number(id)] = total / loggedDays;
  }
  const { energyEstimated: _a, ...averageMacros } =
    loggedDays > 0
      ? macrosOf(averages)
      : { ...ZERO_MACROS, energyEstimated: false };
  const { coverage } = sumNutrients(entries.map((e) => e.nutrients));

  return { days, loggedDays, averages, averageMacros, coverage };
}

export type SourceItem = { key: string; name: string; nutrients: NutrientMap };

export type Source = {
  key: string;
  name: string;
  amount: number;
  /** Share of the nutrient total across all items, 0 to 1. */
  share: number;
  count: number;
};

/** The foods that supplied the most of one nutrient. */
export function topSources(
  items: SourceItem[],
  nutrientId: number,
  limit = 8,
): Source[] {
  const byKey = new Map<string, Source>();
  let total = 0;
  for (const item of items) {
    const amount = item.nutrients[nutrientId];
    if (amount === undefined || amount <= 0) continue;
    total += amount;
    const s = byKey.get(item.key) ?? {
      key: item.key,
      name: item.name,
      amount: 0,
      share: 0,
      count: 0,
    };
    s.amount += amount;
    s.count += 1;
    byKey.set(item.key, s);
  }
  return [...byKey.values()]
    .map((s) => ({ ...s, share: total > 0 ? s.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}
