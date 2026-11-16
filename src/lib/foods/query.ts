// Turn user search text into a Postgres prefix tsquery, forgiving the way
// people type: everyday and regional words map to USDA's ("yoghurt",
// "dal", "aubergine"), and misspelled words are corrected against the
// words that actually appear in food names. Pure, so tested.

/**
 * Words people use that USDA names differently. Each alternative may be
 * several words ("peanut butter"); the original word is always kept too.
 */
export const SYNONYMS: Record<string, string[]> = {
  yoghurt: ["yogurt"],
  yogourt: ["yogurt"],
  curd: ["yogurt"],
  dahi: ["yogurt"],
  aubergine: ["eggplant"],
  brinjal: ["eggplant"],
  courgette: ["zucchini"],
  prawn: ["shrimp"],
  prawns: ["shrimp"],
  coriander: ["cilantro"],
  cilantro: ["coriander"],
  capsicum: ["sweet pepper"],
  garbanzo: ["chickpea"],
  chana: ["chickpea"],
  chole: ["chickpea"],
  dal: ["lentil"],
  daal: ["lentil"],
  dhal: ["lentil"],
  dahl: ["lentil"],
  rajma: ["kidney beans"],
  mince: ["ground"],
  porridge: ["oat"],
  oatmeal: ["oat"],
  soda: ["carbonated"],
  pop: ["carbonated"],
  fizzy: ["carbonated"],
  coke: ["cola"],
  pepsi: ["cola"],
  fries: ["french fried"],
  crisps: ["potato chips"],
  ketchup: ["catsup"],
  catsup: ["ketchup"],
  roti: ["chapati"],
  chapatti: ["chapati"],
  phulka: ["chapati"],
  donut: ["doughnut"],
  donuts: ["doughnuts"],
  veggie: ["vegetable"],
  veggies: ["vegetables"],
  bbq: ["barbecue"],
  pb: ["peanut butter"],
  oj: ["orange juice"],
  evoo: ["olive oil"],
  ghee: ["butter oil"],
  aloo: ["potato"],
  gobi: ["cauliflower"],
  palak: ["spinach"],
  bhindi: ["okra"],
  methi: ["fenugreek"],
  jeera: ["cumin"],
  haldi: ["turmeric"],
  atta: ["wheat flour"],
  besan: ["chickpea flour"],
  maida: ["wheat flour white"],
};

/** Words that appear in food names, with how many foods use each. */
export type Vocabulary = { words: string[]; counts: Map<string, number> };

export function vocabulary(entries: { word: string; count: number }[]) {
  const counts = new Map(entries.map((e) => [e.word, e.count]));
  return { words: [...counts.keys()].sort(), counts } satisfies Vocabulary;
}

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 8);
}

/** Whether any vocabulary word starts with this prefix (binary search). */
function hasPrefix(vocab: Vocabulary, prefix: string): boolean {
  let lo = 0;
  let hi = vocab.words.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (vocab.words[mid]! < prefix) lo = mid + 1;
    else hi = mid;
  }
  return vocab.words[lo]?.startsWith(prefix) ?? false;
}

/** Optimal string alignment distance, giving up past `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, prev2[j - 2]! + 1);
      }
      row.push(d);
      best = Math.min(best, d);
    }
    if (best > max) return max + 1;
    prev2.splice(0, prev2.length, ...prev);
    prev = row;
  }
  return prev[b.length]!;
}

/**
 * The food-name word a misspelled token most likely meant, or null when
 * it is fine as typed or nothing is close. Short words are left alone:
 * too many real words sit one letter apart.
 */
export function correctWord(token: string, vocab: Vocabulary): string | null {
  if (token.length < 5 || /\d/.test(token) || hasPrefix(vocab, token)) {
    return null;
  }
  const max = token.length >= 7 ? 2 : 1;
  let best: { word: string; d: number; n: number } | null = null;
  for (const word of vocab.words) {
    if (word.length < 3) continue;
    const d = editDistance(token, word, max);
    if (d > max) continue;
    const n = vocab.counts.get(word) ?? 0;
    if (!best || d < best.d || (d === best.d && n > best.n)) {
      best = { word, d, n };
    }
  }
  return best?.word ?? null;
}

export type QueryPlan = {
  /** For to_tsquery('english', ...). */
  tsquery: string;
  /** The text with corrections applied, for trigram similarity. */
  text: string;
  /** The corrected text, when any word was changed; else null. */
  corrected: string | null;
  /** The first word and its synonyms' first words, for ranking. */
  lead: string[];
};

const prefix = (phrase: string) => {
  const words = tokens(phrase);
  return words.length === 1
    ? `${words[0]}:*`
    : `(${words.map((w) => `${w}:*`).join(" & ")})`;
};

/**
 * "chiken brest" -> chicken:* & breast:*, and "dal" -> (dal:* | lentil:*).
 * Null when nothing is searchable.
 */
export function planQuery(text: string, vocab?: Vocabulary): QueryPlan | null {
  const words = tokens(text);
  if (words.length === 0) return null;
  let changed = false;
  const fixed = words.map((w) => {
    if (SYNONYMS[w] || !vocab) return w;
    const c = correctWord(w, vocab);
    if (c) changed = true;
    return c ?? w;
  });
  const groups = fixed.map((w) => {
    const alternatives = [w, ...(SYNONYMS[w] ?? [])].map(prefix);
    return alternatives.length === 1
      ? alternatives[0]!
      : `(${alternatives.join(" | ")})`;
  });
  return {
    tsquery: groups.join(" & "),
    text: fixed.join(" "),
    corrected: changed ? fixed.join(" ") : null,
    lead: [
      ...new Set(
        [fixed[0]!, ...(SYNONYMS[fixed[0]!] ?? [])].map((a) => tokens(a)[0]!),
      ),
    ],
  };
}

/** "Chicken brea" -> "chicken:* & brea:*". Null when nothing searchable. */
export function prefixTsQuery(text: string): string | null {
  return planQuery(text)?.tsquery ?? null;
}
