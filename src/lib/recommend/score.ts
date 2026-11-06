// The transparent recommendation score (SPEC.md "Recommendation engine"):
//   score = 0.30 M + 0.25 T + 0.20 F + 0.10 C + 0.075 N + 0.075 R - D
// No LLM in the ranking loop. Weights live in one config object.

import type { Budget } from "./budget";

export const WEIGHTS = {
  M: 0.3,
  T: 0.25,
  /** Familiar: suggestions should use foods the user already eats. */
  F: 0.2,
  C: 0.1,
  N: 0.075,
  R: 0.075,
  dislikePenalty: 0.15,
  /** Rating prior for recipes the user has not rated. */
  unratedPrior: 0.6,
  /** Days after which a cooked recipe counts as fully novel again. */
  noveltyDays: 14,
} as const;

export type Terms = {
  M: number;
  T: number;
  /** Share of the ingredients the user already eats (see familiar.ts). */
  F: number;
  C: number;
  N: number;
  R: number;
  D: number;
};

const MACRO_KEYS = ["kcal", "proteinG", "carbsG", "fatG"] as const;

/** Per-macro relative error, capped at 1; a budget of 0 or less scores 1. */
export function macroErrors(
  serving: Budget,
  budget: Budget,
): Record<keyof Budget, number> {
  const out = {} as Record<keyof Budget, number>;
  for (const k of MACRO_KEYS) {
    const b = budget[k];
    out[k] = b <= 0 ? 1 : Math.min(1, Math.abs(serving[k] - b) / b);
  }
  return out;
}

/** M: how close one serving is to the slot's remaining budget, 0 to 1. */
export function macroFit(serving: Budget, budget: Budget): number {
  const errors = macroErrors(serving, budget);
  const mean =
    MACRO_KEYS.reduce((s, k) => s + errors[k], 0) / MACRO_KEYS.length;
  return 1 - mean;
}

/** T: cosine similarity mapped from [-1, 1] to [0, 1]. */
export function tasteSimilarity(cosine: number | null): number {
  return cosine === null ? 0.5 : (cosine + 1) / 2;
}

/** C: 1 for a liked cuisine, else the learned weight (0 when unknown). */
export function cuisinePreference(
  cuisine: string | null,
  liked: string[],
  learned: Record<string, number>,
): number {
  if (!cuisine) return 0;
  const c = cuisine.toLowerCase();
  if (liked.map((l) => l.toLowerCase()).includes(c)) return 1;
  return Math.max(0, Math.min(1, learned[c] ?? 0));
}

/** N: 1 if not cooked in the last 14 days, else days since cooked / 14. */
export function novelty(daysSinceCooked: number | null): number {
  if (daysSinceCooked === null) return 1;
  return Math.max(0, Math.min(1, daysSinceCooked / WEIGHTS.noveltyDays));
}

/** R: the user's rating / 5, or the unrated prior. */
export function ratingPrior(rating: number | null): number {
  return rating === null ? WEIGHTS.unratedPrior : rating / 5;
}

/** D: 0.15 per disliked ingredient found in the recipe. */
export function dislikePenalty(matches: number): number {
  return matches * WEIGHTS.dislikePenalty;
}

export function weightedTerms(t: Terms) {
  return {
    M: WEIGHTS.M * t.M,
    T: WEIGHTS.T * t.T,
    F: WEIGHTS.F * t.F,
    C: WEIGHTS.C * t.C,
    N: WEIGHTS.N * t.N,
    R: WEIGHTS.R * t.R,
  };
}

export function score(t: Terms): number {
  const w = weightedTerms(t);
  return w.M + w.T + w.F + w.C + w.N + w.R - t.D;
}
