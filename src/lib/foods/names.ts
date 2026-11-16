// Short, everyday names for USDA foods. USDA names are precise but read
// like a catalog ("Chicken, broilers or fryers, breast, meat only, cooked,
// roasted"); this turns them into "Chicken breast, cooked, roasted". The
// full name is kept alongside, so nothing is lost. Pure, so tested.

/** Segments that add nothing a person would say. */
const NOISE = [
  /^broilers or fryers$/,
  /^meat only$/,
  /^all commercial varieties$/,
  /^commercially prepared$/,
  /^year round average$/,
  /^mature seeds$/,
  /^(un)?enriched$/,
  /^regular$/,
  /^fluid$/,
  /^fresh$/,
  /^not fortified$/,
  /^with added vitamins? .*$/,
  /^salad or cooking$/,
  /^grade a$/,
  /^ns as to .*$/,
  /^total can contents$/,
  /^solids$/,
  /^includes .*$/,
  /^separable lean( and fat| only)?$/,
  /^trimmed to .* fat$/,
  /^all grades$/,
  /^(usda )?(choice|select|prime)$/,
  /^composite of .*$/,
  /^dry heat$/,
  /^as purchased$/,
  /^(with|without) salt$/,
  /^salt not added in processing$/,
];

/** Heads read better after their kind: "Oil, olive" is "Olive oil". */
const KIND_FIRST = new Set([
  "oil",
  "cheese",
  "beans",
  "flour",
  "sauce",
  "vinegar",
  "peppers",
  "squash",
  "lettuce",
  "cabbage",
  "rice",
  "milk",
  "yogurt",
  "bread",
  "pasta",
  "soup",
]);

/** Heads that are only a category: "Nuts, almonds" is just "Almonds". */
const CATEGORY = new Set([
  "nuts",
  "spices",
  "fish",
  "beverages",
  "alcoholic beverage",
  "alcoholic beverages",
  "carbonated beverage",
  "cereals",
  "seeds",
  "candies",
  "snacks",
  "crustaceans",
  "mollusks",
]);

/** Meats whose cut belongs in the name: "Chicken breast". */
const MEATS = new Set(["chicken", "beef", "pork", "turkey", "lamb", "veal"]);
const CUTS = new Set([
  "breast",
  "thigh",
  "thighs",
  "drumstick",
  "wing",
  "wings",
  "leg",
  "ground",
  "tenderloin",
  "loin",
  "liver",
]);

/** Kinds short enough to join their head; longer ones stay a segment. */
const MAX_KIND_WORDS = 2;

/** "PIZZA HUT 14" Cheese Pizza" -> "Pizza Hut 14" Cheese Pizza". */
function untitle(text: string): string {
  return text.replace(
    /\b[A-Z][A-Z'&.]{2,}\b/g,
    (w) => w.charAt(0) + w.slice(1).toLowerCase(),
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The everyday name of a USDA food. Other sources (Open Food Facts,
 * custom foods) already use product names and are returned as given.
 */
export function commonName(name: string, source: string): string {
  if (!source.startsWith("usda")) return name;
  const parts = untitle(name)
    .replace(/\([^)]*\)/g, " ")
    .split(",")
    .map((p) =>
      p
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^drained solids$/i, "drained"),
    )
    .filter(Boolean)
    .filter((p) => !NOISE.some((re) => re.test(p.toLowerCase())));
  if (parts.length === 0) return name;

  let [head, ...rest] = parts as [string, ...string[]];
  const lower = head.toLowerCase();
  const kind = rest[0];
  const kindFits = kind && kind.split(" ").length <= MAX_KIND_WORDS;

  if (CATEGORY.has(lower) && kind) {
    // "Beverages, carbonated, cola" keeps reading: "Carbonated, cola".
    head = kind;
    rest = rest.slice(1);
  } else if (MEATS.has(lower) && kind && CUTS.has(kind.toLowerCase())) {
    const cut = kind.toLowerCase();
    head = cut === "ground" ? `Ground ${lower}` : `${head} ${cut}`;
    rest = rest.slice(1);
  } else if (KIND_FIRST.has(lower) && kind && kindFits) {
    head = `${kind} ${lower}`;
    rest = rest.slice(1);
  }

  // Nothing is cut short: raw and cooked must stay apart.
  return [capitalize(head), ...rest.map((p) => p.toLowerCase())].join(", ");
}
