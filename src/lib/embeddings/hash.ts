// A local, dependency-free text embedding used when no Voyage key is set:
// hashed bag of words and word pairs ("feature hashing"), L2-normalised.
// It captures shared ingredients and cuisines, not meaning, but keeps the
// taste term in the recommender meaningful offline and in tests.

export const DIMENSIONS = 1024;

const STOP = new Set([
  "a",
  "an",
  "and",
  "the",
  "of",
  "with",
  "in",
  "on",
  "to",
  "for",
  "or",
  "raw",
  "cooked",
  "fresh",
  "g",
  "tbsp",
  "tsp",
  "cup",
  "cups",
]);

/** FNV-1a 32-bit hash. */
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tokens(text: string): string[] {
  const words = (text.toLowerCase().match(/[\p{L}]+/gu) ?? [])
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .filter((w) => w.length > 1 && !STOP.has(w));
  const pairs = words.slice(1).map((w, i) => `${words[i]}_${w}`);
  return [...words, ...pairs];
}

export function hashEmbedding(text: string, dims = DIMENSIONS): number[] {
  const v = new Array<number>(dims).fill(0);
  for (const t of tokens(text)) {
    const h = fnv1a(t);
    // One bit of the hash picks the sign, so collisions tend to cancel.
    v[h % dims]! += (h >>> 31) & 1 ? 1 : -1;
  }
  return normalize(v);
}

export function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}
