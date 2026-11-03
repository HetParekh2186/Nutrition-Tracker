// Taste profile (SPEC.md "Taste profile"): a weighted average of
// embeddings from the user's history, with a 30-day half-life.
//   w = event_weight x 0.5^(days_ago / 30)

import { normalize } from "@/lib/embeddings/hash";

export type TasteSignal =
  "cook_complete" | "log" | "save" | "rate" | "skip" | "meal";

export const HALF_LIFE_DAYS = 30;

/** Event weights from the spec; a rating counts rating - 3. */
export function eventWeight(
  signal: TasteSignal,
  rating?: number | null,
): number {
  switch (signal) {
    case "cook_complete":
      return 3;
    case "log":
      return 2;
    case "save":
      return 1.5;
    case "rate":
      return (rating ?? 3) - 3;
    case "skip":
      return -0.5;
    case "meal":
      return 1;
  }
}

export function decay(daysAgo: number): number {
  return 0.5 ** (Math.max(0, daysAgo) / HALF_LIFE_DAYS);
}

export type WeightedEvent = {
  signal: TasteSignal;
  rating?: number | null;
  daysAgo: number;
  embedding: number[] | null;
  cuisine?: string | null;
};

export function signalWeight(e: WeightedEvent): number {
  return eventWeight(e.signal, e.rating) * decay(e.daysAgo);
}

/**
 * Cold start: until there is real history (a cook, a recipe log or a
 * logged meal), the meals picked in onboarding (saves) count as cooked
 * today.
 */
export function applyColdStart(events: WeightedEvent[]): WeightedEvent[] {
  const real = events.some((e) =>
    ["cook_complete", "log", "meal"].includes(e.signal),
  );
  if (real) return events;
  return events.map((e) =>
    e.signal === "save" ? { ...e, signal: "cook_complete", daysAgo: 0 } : e,
  );
}

/** Weighted average of embeddings, unit length; null without signal. */
export function tasteEmbedding(events: WeightedEvent[]): number[] | null {
  let sum: number[] | null = null;
  let total = 0;
  for (const e of events) {
    if (!e.embedding) continue;
    const w = signalWeight(e);
    if (w === 0) continue;
    sum ??= new Array<number>(e.embedding.length).fill(0);
    for (let i = 0; i < e.embedding.length; i++) sum[i]! += w * e.embedding[i]!;
    total += Math.abs(w);
  }
  if (!sum || total === 0) return null;
  const v = normalize(sum);
  return v.every((x) => x === 0) ? null : v;
}

/** Share of positive taste weight per cuisine, summing to 1. */
export function cuisineWeights(
  events: WeightedEvent[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of events) {
    const w = signalWeight(e);
    if (!e.cuisine || w <= 0) continue;
    const c = e.cuisine.toLowerCase();
    totals[c] = (totals[c] ?? 0) + w;
  }
  const sum = Object.values(totals).reduce((s, x) => s + x, 0);
  if (sum === 0) return {};
  return Object.fromEntries(
    Object.entries(totals)
      .map(([c, w]) => [c, Number((w / sum).toFixed(4))] as const)
      .sort((a, b) => b[1] - a[1]),
  );
}
