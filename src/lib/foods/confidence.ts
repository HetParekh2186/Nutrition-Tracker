// How sure we are that a search hit is the food a query meant. Used by
// recipe generation and plain-English logging; under 0.7 the UI offers
// alternatives (SPEC.md "Plain-English logging").

export const CONFIDENT = 0.7;

export function matchConfidence(signals: {
  /** pg_trgm word_similarity(query, name), 0 to 1. */
  similarity: number;
  /** Every query word prefix-matched the name. */
  fullText: boolean;
  /** The user has logged this food before. */
  usedBefore: boolean;
  /** Next-best hit's similarity, if any; a close runner-up lowers certainty. */
  runnerUp?: number | undefined;
}): number {
  let c = signals.similarity;
  if (signals.fullText) c += 0.25;
  if (signals.usedBefore) c += 0.1;
  if (
    signals.runnerUp !== undefined &&
    signals.similarity - signals.runnerUp < 0.05
  ) {
    c -= 0.1;
  }
  return Math.max(0, Math.min(1, c));
}
