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
  /^nfs$/,
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

/** Restaurant chains, as USDA spells them, and as people do. */
const CHAINS: [RegExp, string][] = [
  [/^mcdonald'?s\b/i, "McDonald's"],
  [/^burger king\b/i, "Burger King"],
  [/^kfc\b/i, "KFC"],
  [/^popeyes\b/i, "Popeyes"],
  [/^(wendy'?s|wend'ys)\b/i, "Wendy's"],
  [/^denny'?s\b/i, "Denny's"],
  [/^subway\b/i, "Subway"],
  [/^taco bell\b/i, "Taco Bell"],
  [/^applebee'?s\b/i, "Applebee's"],
  [/^cracker barrel\b/i, "Cracker Barrel"],
  [/^t\.?g\.?i\.? friday'?s\b/i, "TGI Fridays"],
  [/^olive garden\b/i, "Olive Garden"],
  [/^carrabba'?s italian grill\b/i, "Carrabba's"],
  [/^pizza hut\b/i, "Pizza Hut"],
  [/^domino'?s\b/i, "Domino's"],
  [/^chick-fil-a\b/i, "Chick-fil-A"],
  [/^little caesars\b/i, "Little Caesars"],
  [/^papa john'?s\b/i, "Papa John's"],
];

/** Restaurant styles: "Restaurant, Chinese, ..." is a Chinese restaurant. */
const STYLES: Record<string, string> = {
  chinese: "Chinese restaurant",
  italian: "Italian restaurant",
  mexican: "Mexican restaurant",
  latino: "Latin American restaurant",
  "family style": "Family restaurant",
};

/** FNDDS marks where a dish came from inside the name. */
const FROM_FAST_FOOD =
  /^(from )?(fast food|restaurant)( (\/|or) (fast food|restaurant))?$/i;

/** The same, at the end of a phrase: "Baked beans from fast food". */
const INLINE_FAST_FOOD =
  /\s(from )(fast food|restaurant)( (\/|or) (fast food|restaurant))?$/i;

export type EverydayFood = {
  /** The everyday name: "Big Mac", "Chicken breast, cooked, roasted". */
  name: string;
  /** Where it is from: a chain, "Fast food", or a kind of restaurant. */
  brand: string | null;
};

function chainOf(text: string): { brand: string; rest: string } | null {
  for (const [re, brand] of CHAINS) {
    const m = re.exec(text);
    if (m) return { brand, rest: text.slice(m[0].length) };
  }
  return null;
}

/** "14" Cheese Pizza" reads as "Cheese Pizza, 14"". */
function sizeLast(text: string): string {
  return text.replace(/^(\d+)" (.+?)(,|$)/, '$2, $1"$3');
}

/**
 * Restaurant and fast food items name the place first ("McDONALD'S, BIG
 * MAC", "Restaurant, Chinese, orange chicken", "Hamburger, from fast food").
 * The place becomes the brand and the dish becomes the name.
 */
function restaurant(name: string): { rest: string; brand: string } | null {
  const chain = chainOf(name);
  if (chain) {
    const rest = sizeLast(chain.rest.replace(/^[\s,]+/, "").trim());
    return rest ? { rest, brand: chain.brand } : null;
  }
  const fast = /^fast foods?, (pizza chain, )?/i.exec(name);
  if (fast) {
    return {
      rest: sizeLast(name.slice(fast[0].length).replace(/;/g, ",")),
      brand: fast[1] ? "Pizza chain" : "Fast food",
    };
  }
  const place = /^restaurant, ([^,]+), /i.exec(name);
  if (place) {
    const style = STYLES[place[1]!.toLowerCase()];
    return {
      rest: name.slice(place[0].length),
      brand: style ?? "Restaurant",
    };
  }
  // FNDDS: "Big Mac (McDonalds)", "Hamburger, from fast food, 1 patty".
  const paren = /\(([^)]+)\)\s*$/.exec(name);
  const tagged =
    paren && chainOf(paren[1]!.replace(/mcdonalds/i, "McDonald's"));
  if (tagged && !tagged.rest.trim()) {
    return { rest: name.slice(0, paren.index).trim(), brand: tagged.brand };
  }
  const parts = name.split(",").map((p) => p.trim());
  for (const [i, part] of parts.entries()) {
    const m = i > 0 ? FROM_FAST_FOOD.exec(part) : INLINE_FAST_FOOD.exec(part);
    if (!m) continue;
    const kept = part.slice(0, m.index).trim();
    return {
      rest: parts
        .map((p, j) => (j === i ? kept : p))
        .filter(Boolean)
        .join(", "),
      brand: m[2]!.toLowerCase() === "restaurant" ? "Restaurant" : "Fast food",
    };
  }
  return null;
}

function tidy(name: string): string {
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

/**
 * The everyday name of a USDA food, and the chain or kind of restaurant it
 * comes from. Other sources (Open Food Facts, custom foods) already use
 * product names and are returned as given.
 */
export function everydayFood(name: string, source: string): EverydayFood {
  if (!source.startsWith("usda")) return { name, brand: null };
  const place = restaurant(name);
  if (place) {
    // Dish names from chains keep their own capitals ("Big Mac").
    const dish = tidy(place.rest);
    return { name: dish, brand: place.brand };
  }
  return { name: tidy(name), brand: null };
}

/** The everyday name of a USDA food; see everydayFood. */
export function commonName(name: string, source: string): string {
  return everydayFood(name, source).name;
}
