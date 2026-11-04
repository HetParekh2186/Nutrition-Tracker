// Diets as sets of animal foods. A diet is a hard rule (SPEC.md
// "Candidates"), and real diets rarely match a label: "vegetarian, but I
// eat chicken and eggs" is the set {chicken, eggs, dairy, honey}. Ingredient
// text says which animal foods a recipe contains; it suits a diet when every
// one of them is allowed.
//
// Preset meanings follow common Indian usage, which the eggetarian preset
// implies: vegetarian allows dairy but not eggs; eggetarian allows both.
// Client-safe: no server imports.

import { ANIMAL_FOODS, type AnimalFood, type DietType } from "@/lib/db/enums";

// Plant foods whose names contain an animal word, removed before matching.
const PLANT_LOOKALIKES = [
  // "vegan sausage", "plant-based burger", "mock duck". Not "soy": "soy
  // chicken" is usually chicken in soy sauce.
  /\b(vegan|veggie|vegetarian|plant[- ]based|meatless|mock|faux|tofu|tempeh|seitan|jackfruit|quorn)\s+[\w']+/gi,
  /\b(coconut|almond|soy|soya|oat|rice|cashew|peanut|sunflower|cocoa|shea|apple|nut|hemp|pea|macadamia|hazelnut|pistachio|seed|dairy[- ]free|non[- ]dairy)\s+(milk|cream|creamer|yogh?urt|butter|cheese|ghee|mayo|mayonnaise)\b/gi,
  // "egg-free mayo" is free of the egg, so the product word goes too.
  /\b(egg|dairy|meat)[- ]free(\s+[\w']+)?|\beggless(\s+[\w']+)?|\bgluten[- ]free\b/gi,
  /\bbutter(nut)?\s+(squash|beans?|lettuce)\b|\bcream of tartar\b|\begg plants?\b|\bbean curd\b/gi,
  /\boyster mushrooms?\b|\bmushrooms?,? oyster\b|\blamb'?s lettuce\b|\bchicken of the woods\b/gi,
  /\bkidney beans?\b|\bbeans?,? kidney\b/gi,
];

// Goat's cheese is dairy, not goat meat.
const GOAT_DAIRY = /\bgoat'?s?\s+(cheese|milk|yogh?urt|curd)\b/gi;

// A product word after a named food takes that food's group: "chicken
// sausage" is chicken, "tuna steak" is fish, "cauliflower steak" is neither.
const QUALIFIED =
  /\b(chicken|turkey|duck|beef|pork|lamb|mutton|goat|crab|fish|salmon|tuna|swordfish|halibut|cauliflower|cabbage|portobello|mushroom|coconut|lentil|bean|vegetable)\s+(meat|mince|meatballs?|meatloaf|sausages?|bacon|ham|pepperoni|salami|hot ?dogs?|burgers?|patt(?:y|ies)|nuggets?|liver|kidneys?|broth|stock|steaks?|tenderloin|chops?|jerky)\b/gi;

// Meat of unknown animal needs every red meat allowed.
const ANY_MEAT: AnimalFood[] = ["beef", "pork", "lamb"];

const RULES: [AnimalFood[], RegExp][] = [
  [
    ["beef"],
    /\b(beef|veal|steaks?|sirloin|brisket|rib-?eye|t-bone|filet mignon|oxtail|suet|tallow|hamburgers?|pastrami|bresaola)\b/i,
  ],
  [
    ["pork"],
    /\b(pork|bacon|hams?|gammon|lard|lardons?|prosciutto|pancetta|guanciale|pepperoni|salami|chorizo|sausages?|hot ?dogs?|frankfurters?|bratwurst|kielbasa|bologna|spare ?ribs|chicharr[oó]n(es)?)\b/i,
  ],
  [["lamb"], /\b(lamb|mutton|goat)\b/i],
  [["chicken"], /\bchickens?\b/i],
  [
    ["poultry"],
    /\b(turkey|duck|goose|quail|pheasant|poussin|squab|guinea fowl|ostrich|emu|foie gras)\b/i,
  ],
  [["chicken", "poultry"], /\bpoultry\b/i],
  [
    ["fish"],
    /\b(fish|salmon|tuna|cod|tilapia|trout|halibut|mackerel|sardines?|anchov(y|ies)|haddock|pollock|snapper|sea ?bass|swordfish|monkfish|catfish|whitefish|herring|carp|bonito|katsuobushi|dashi|worcestershire|caviar|roe|surimi)\b/i,
  ],
  [
    ["shellfish"],
    /\b(shellfish|shrimps?|prawns?|crabs?|lobsters?|crayfish|crawfish|scallops?|clams?|mussels?|oysters?|squid|calamari|octopus|cuttlefish|crustaceans?|mollusks?|molluscs?|snails?|escargots?)\b/i,
  ],
  [["fish", "shellfish"], /\bseafood\b/i],
  [
    ["eggs"],
    /\b(eggs?|egg whites?|yolks?|mayo|mayonnaise|aioli|meringues?|frittatas?|omelet(te)?s?)\b/i,
  ],
  [["eggs", "dairy"], /\b(custard|hollandaise|brioche|carbonara)\b/i],
  // Sauces and breads that hide an animal food.
  [["dairy"], /\b(pesto|tzatziki|alfredo|b[eé]chamel|naan)\b/i],
  [["fish", "eggs", "dairy"], /\bcaesar\b/i],
  [
    ["dairy"],
    /\b(milk|cheeses?|cheddar|parmesan|mozzarella|feta|ricotta|paneer|mascarpone|brie|gouda|gruy[eè]re|halloumi|quark|yogh?urts?|butter|cream|cr[eè]me|ghee|whey|casein|kefir|buttermilk|curds?|dahi|khoa|khoya|malai|lassi|raita|chhena|kulfi)\b/i,
  ],
  [["honey"], /\b(honey|honeycomb)\b/i],
];

// Meat words that do not name the animal. In an ingredient that names one
// ("Beef, ground, 90% lean meat") they add nothing; alone ("gelatin",
// "venison") they need every red meat allowed.
const UNKNOWN_MEAT =
  /\b(meats?|mince|meatballs?|meatloaf|bone broth|venison|rabbit|boar|bison|gelatin(e|s)?|offal|liver|kidneys?|tripe|bone marrow|jerky|tenderloin|chops?|frogs?)\b/i;
const NAMED_MEAT: AnimalFood[] = [
  "beef",
  "pork",
  "lamb",
  "chicken",
  "poultry",
  "fish",
  "shellfish",
];

/**
 * The animal foods named in some ingredient text, in ANIMAL_FOODS order.
 * Each string is one ingredient; " | " also separates ingredients, so a
 * recipe's whole ingredient list can come in as one string.
 */
export function animalFoodsIn(texts: string[]): AnimalFood[] {
  const found = new Set<AnimalFood>();
  for (const item of texts.flatMap((t) => t.split(" | "))) {
    let text = item;
    for (const re of PLANT_LOOKALIKES) text = text.replace(re, " ");
    text = text.replace(GOAT_DAIRY, "$1").replace(QUALIFIED, "$1");
    const here = new Set<AnimalFood>();
    for (const [groups, re] of RULES) {
      if (re.test(text)) groups.forEach((g) => here.add(g));
    }
    if (UNKNOWN_MEAT.test(text) && !NAMED_MEAT.some((g) => here.has(g))) {
      ANY_MEAT.forEach((g) => here.add(g));
    }
    here.forEach((g) => found.add(g));
  }
  return ANIMAL_FOODS.filter((g) => found.has(g));
}

export const DIET_PRESETS: Record<DietType, readonly AnimalFood[]> = {
  omnivore: ANIMAL_FOODS,
  pescatarian: ["fish", "shellfish", "eggs", "dairy", "honey"],
  eggetarian: ["eggs", "dairy", "honey"],
  vegetarian: ["dairy", "honey"],
  vegan: [],
};

const PRESET_LABELS: Record<DietType, string> = {
  omnivore: "Everything",
  pescatarian: "Pescatarian",
  eggetarian: "Eggetarian",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
};

/** Short names for sentences: "Vegetarian, plus chicken and eggs". */
export const ANIMAL_FOOD_NAMES: Record<AnimalFood, string> = {
  beef: "beef",
  pork: "pork",
  lamb: "lamb",
  chicken: "chicken",
  poultry: "other poultry",
  fish: "fish",
  shellfish: "shellfish",
  eggs: "eggs",
  dairy: "dairy",
  honey: "honey",
};

/** What each group covers, spelled out for the recipe writer. */
const FOR_THE_MODEL: Record<AnimalFood, string> = {
  beef: "beef and veal",
  pork: "pork, including bacon, ham, lard and most sausages",
  lamb: "lamb, mutton and goat",
  chicken: "chicken, including chicken stock",
  poultry: "turkey, duck and other poultry besides chicken",
  fish: "fish, including fish sauce, anchovies, dashi and Worcestershire",
  shellfish: "shellfish, including shrimp, crab, squid and oyster sauce",
  eggs: "eggs, including mayonnaise, aioli and egg pasta",
  dairy:
    "dairy, including milk, butter, ghee, cream, cheese, paneer and yogurt",
  honey: "honey",
};

/** Dedupes, drops unknown values and sorts into ANIMAL_FOODS order. */
export function normalizeEats(eats: readonly string[]): AnimalFood[] {
  return ANIMAL_FOODS.filter((g) => eats.includes(g));
}

/** The preset that is exactly this set, or null for a custom diet. */
export function presetFor(eats: readonly AnimalFood[]): DietType | null {
  const set = normalizeEats(eats).join(",");
  const match = (Object.keys(DIET_PRESETS) as DietType[]).find(
    (p) => DIET_PRESETS[p].join(",") === set,
  );
  return match ?? null;
}

function listWords(words: string[]): string {
  if (words.length < 2) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/**
 * A human name for the set: the closest preset plus or minus a few foods,
 * "Vegetarian, plus eggs" or "Everything except beef and pork".
 */
export function describeDiet(eats: readonly AnimalFood[]): string {
  const set = new Set(normalizeEats(eats));
  let best = { label: "", cost: Infinity };
  for (const preset of Object.keys(DIET_PRESETS) as DietType[]) {
    const base = new Set(DIET_PRESETS[preset]);
    const added = ANIMAL_FOODS.filter((g) => set.has(g) && !base.has(g));
    const removed = ANIMAL_FOODS.filter((g) => base.has(g) && !set.has(g));
    // On a tie "Vegan, plus honey" reads better than "Vegetarian, but no dairy".
    const cost = added.length + removed.length * 1.01;
    if (cost >= best.cost) continue;
    const name = (gs: AnimalFood[]) =>
      listWords(gs.map((g) => ANIMAL_FOOD_NAMES[g]));
    let label = PRESET_LABELS[preset];
    if (preset === "omnivore" && removed.length) {
      label += ` except ${name(removed)}`;
    } else {
      if (added.length) label += `, plus ${name(added)}`;
      if (removed.length) label += `, but no ${name(removed)}`;
    }
    best = { label, cost };
  }
  return best.label;
}

/** Diet rules for a prompt, with every forbidden group spelled out. */
export function dietRules(eats: readonly AnimalFood[]): string {
  const allowed = normalizeEats(eats);
  const forbidden = ANIMAL_FOODS.filter((g) => !allowed.includes(g));
  if (!forbidden.length) return "Diet: eats everything.";
  const never = forbidden.map((g) => FOR_THE_MODEL[g]);
  // Gelatin comes from beef or pork.
  if (forbidden.includes("beef") || forbidden.includes("pork")) {
    never.push("gelatin");
  }
  return [
    `Diet: ${describeDiet(allowed)}.`,
    allowed.length
      ? `The only animal foods they eat: ${allowed.map((g) => ANIMAL_FOOD_NAMES[g]).join(", ")}.`
      : "They eat no animal foods at all.",
    `Never use: ${never.join("; ")}.`,
  ].join(" ");
}

/** Animal foods in the text that the diet does not allow. */
export function dietBreaks(
  texts: string[],
  eats: readonly AnimalFood[],
): AnimalFood[] {
  return animalFoodsIn(texts).filter((g) => !eats.includes(g));
}

// ========== Recipe tags ==========

const CONTAINS = "contains:";
const LEGACY_TAGS = [
  "pescatarian",
  "eggetarian",
  "vegetarian",
  "vegan",
] as const;

/** Is this tag diet bookkeeping rather than something to show? */
export function isDietTag(tag: string): boolean {
  return (
    tag.startsWith(CONTAINS) || (LEGACY_TAGS as readonly string[]).includes(tag)
  );
}

/** Tags worth showing: contains: tags are bookkeeping. */
export function displayTags(tags: string[]): string[] {
  return tags.filter((t) => !t.startsWith(CONTAINS));
}

/**
 * Tags for a recipe's diet: one `contains:<food>` per animal food, plus the
 * preset names it suits, which read well in the recipe library.
 */
export function dietTagsFor(ingredientNames: string[]): string[] {
  const contains = animalFoodsIn(ingredientNames);
  const presets = LEGACY_TAGS.filter((p) =>
    contains.every((g) => DIET_PRESETS[p].includes(g)),
  );
  return [...presets, ...contains.map((g) => `${CONTAINS}${g}`)];
}

/** Diet tags on a recipe, merged with its other tags (old diet tags dropped). */
export function withDietTags(
  tags: string[],
  ingredientNames: string[],
): string[] {
  const rest = tags.filter((t) => !isDietTag(t));
  return [...new Set([...rest, ...dietTagsFor(ingredientNames)])];
}

/**
 * The animal foods a recipe's tags say it contains. Recipes tagged before
 * `contains:` tags existed fall back to their preset tag, read strictly.
 */
export function containsFromTags(tags: string[]): AnimalFood[] {
  const contains = tags
    .filter((t) => t.startsWith(CONTAINS))
    .map((t) => t.slice(CONTAINS.length));
  if (contains.length || tags.includes("vegan")) return normalizeEats(contains);
  for (const p of ["vegetarian", "eggetarian", "pescatarian"] as const) {
    if (tags.includes(p)) return [...DIET_PRESETS[p]];
  }
  return [...ANIMAL_FOODS];
}

/** Does a recipe with these tags suit someone who eats these foods? */
export function suitsDiet(
  tags: string[],
  eats: readonly AnimalFood[],
): boolean {
  return containsFromTags(tags).every((g) => eats.includes(g));
}
