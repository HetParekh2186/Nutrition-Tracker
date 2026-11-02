// Resolve a free-text food query ("garlic, raw") to a food: trigram plus
// full-text search, preferring foods the user has logged before. Shared by
// recipe generation and plain-English logging.

import { matchConfidence } from "./confidence";
import { searchFoods } from "./repo";
import type { FoodHit } from "./types";

export type Resolution = {
  query: string;
  best: FoodHit | null;
  confidence: number;
  alternatives: FoodHit[];
};

/**
 * Looser versions of a query to try when the exact one finds nothing,
 * dropping leading words first since they tend to be varieties
 * ("basmati rice, dry" -> "rice, dry" -> "rice"). Pure, so tested.
 */
export function relaxedQueries(query: string): string[] {
  const cleaned = query
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const [head = "", ...rest] = cleaned.split(",").map((p) => p.trim());
  const tail = rest.filter(Boolean).join(", ");
  const words = head.split(" ").filter(Boolean);
  const out: string[] = [];
  for (let i = 1; i < words.length; i++) {
    const shorter = words.slice(i).join(" ");
    out.push(tail ? `${shorter}, ${tail}` : shorter);
  }
  if (tail) out.push(words.slice(-1).join(" "));
  return [...new Set(out)].filter((q) => q && q !== query);
}

/**
 * Share of the original query's words still present in the query that
 * matched, so "masala" matching for "garam masala" counts for half.
 */
export function queryCoverage(matched: string, original: string): number {
  const words = (q: string) => q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const all = words(original);
  if (all.length === 0) return 0;
  const kept = new Set(words(matched));
  return all.filter((w) => kept.has(w)).length / all.length;
}

export async function resolveFoodQuery(
  userId: string,
  query: string,
): Promise<Resolution> {
  let hits = await searchFoods(userId, query, 4);
  let matchedQuery = query;
  for (const q of relaxedQueries(query)) {
    if (hits.length) break;
    hits = await searchFoods(userId, q, 4);
    matchedQuery = q;
  }
  const [best, ...rest] = hits;
  if (!best) return { query, best: null, confidence: 0, alternatives: [] };
  const confidence =
    matchConfidence({
      similarity: best.match?.similarity ?? 0,
      fullText: best.match?.fullText ?? false,
      usedBefore: best.uses > 0,
      runnerUp: rest[0]?.match?.similarity,
    }) * queryCoverage(matchedQuery, query);
  return {
    query,
    best,
    confidence: Math.max(0, confidence),
    alternatives: rest.slice(0, 3),
  };
}
