// Maximal Marginal Relevance (SPEC.md step 3): re-rank the top 30 so the
// top 10 are not all the same kind of dish.
//   pick argmax  lambda * score - (1 - lambda) * max_sim(item, picked)

import { cosine } from "@/lib/embeddings/hash";

export const MMR_LAMBDA = 0.7;
export const MMR_POOL = 30;
/**
 * Similarity floor for two dishes of the same cuisine, so variety holds even
 * with weak embeddings. 0.7 buried strong matches; 0.4 still spreads
 * cuisines but lets score decide close calls.
 */
export const SAME_CUISINE_SIMILARITY = 0.4;

export type Rankable = {
  id: string;
  score: number;
  embedding: number[] | null;
  cuisine: string | null;
};

/** Similarity between two dishes: embedding cosine, floored by cuisine. */
export function similarity(a: Rankable, b: Rankable): number {
  const cos = a.embedding && b.embedding ? cosine(a.embedding, b.embedding) : 0;
  const sameCuisine =
    a.cuisine &&
    b.cuisine &&
    a.cuisine.toLowerCase() === b.cuisine.toLowerCase();
  return Math.max(cos, sameCuisine ? SAME_CUISINE_SIMILARITY : 0);
}

export function mmr<T extends Rankable>(
  items: T[],
  k = 10,
  lambda = MMR_LAMBDA,
  pool = MMR_POOL,
): T[] {
  const candidates = [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, pool);
  const picked: T[] = [];
  while (picked.length < k && candidates.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    candidates.forEach((c, i) => {
      const redundancy = picked.length
        ? Math.max(...picked.map((p) => similarity(c, p)))
        : 0;
      const value = lambda * c.score - (1 - lambda) * redundancy;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    });
    picked.push(candidates.splice(bestIndex, 1)[0]!);
  }
  return picked;
}
