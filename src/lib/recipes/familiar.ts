// Which of a recipe's ingredients the user already eats. Foods are compared
// by their base ingredient, not by food id, so a logged "Egg, whole, raw"
// covers a recipe's "Egg, whole, cooked, scrambled".

/** USDA heads too broad alone: "Oil, olive" and "Oil, canola" differ. */
const BROAD_HEADS = new Set([
  "oil",
  "oils",
  "bean",
  "beans",
  "cheese",
  "spices",
  "nuts",
  "seeds",
  "flour",
  "wheat flour",
  "sauce",
  "sauces",
  "peppers",
  "squash",
  "lettuce",
  "cabbage",
  "fish",
  "vinegar",
  "beverages",
  "cereals",
  "soup",
  "seasoning mix",
]);

/** Always in the kitchen and never asked about, matched exactly. */
const STAPLES = new Set([
  "water",
  "salt",
  "black pepper",
  "spice pepper",
  "salt and pepper",
  "ice",
]);

/** Below this many logged foods there is too little history to compare. */
export const MIN_KNOWN_FOODS = 5;

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ss|us)$/.test(word)) return word;
  return word.endsWith("s") ? word.slice(0, -1) : word;
}

/**
 * The base ingredient of a food name: "Onions, raw" is "onion", and
 * "Oil, olive, salad or cooking" is "oil, olive".
 */
export function ingredientKey(name: string): string {
  const parts = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(",")
    .map((p) =>
      p
        .replace(/[^a-z\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  const head = parts[0] ?? "";
  const kept = BROAD_HEADS.has(head) && parts[1] ? [head, parts[1]] : [head];
  return kept.map((p) => p.split(" ").map(singular).join(" ")).join(", ");
}

const KIND_IS_ENOUGH = new Set([
  "spice",
  "nut",
  "fish",
  "beverage",
  "cereal",
  "seed",
]);

/** A key as people say it: "oil, olive" is "olive oil". */
export function ingredientLabel(key: string): string {
  const [head, kind] = key.split(", ");
  if (!kind) return head ?? key;
  // "Nuts, almonds" is just almonds; "Oil, olive" needs its head.
  return KIND_IS_ENOUGH.has(head!) ? kind : `${kind} ${head}`;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map(singular);
}

const AMOUNT_WORDS = new Set(
  (
    "cup cups tbsp tablespoon tablespoons tsp teaspoon teaspoons g kg ml l oz lb " +
    "lbs clove cloves pinch can cans tin slice slices large medium small handful " +
    "bunch piece pieces sprig sprigs stalk stalks of a an about"
  ).split(" "),
);

/**
 * An ingredient line as people would name it: "2 cloves garlic, minced"
 * is "garlic", and "1 can (400 g) chickpeas, drained" is "chickpeas".
 */
export function plainName(displayText: string): string {
  const head = displayText
    .replace(/\([^)]*\)/g, " ")
    .split(/,| - /)[0]!
    .trim();
  const kept = head
    .split(/\s+/)
    .filter((w) => !/^[\d/.¼-¾⅐-⅞-]+(g|kg|ml|oz|lb)?$/i.test(w))
    .filter((w) => !AMOUNT_WORDS.has(w.toLowerCase()));
  return kept.join(" ").toLowerCase() || displayText.toLowerCase();
}

/** Every word of the first in the second. */
function within(have: string[], words: Set<string>): boolean {
  return have.length > 0 && have.every((w) => words.has(w));
}

export type Known = {
  /** Base ingredients of logged foods, as word lists. */
  logged: string[][];
  /** The kitchen list, as word lists. */
  kitchen: string[][];
  /** Enough history to say what is new. */
  enough: boolean;
};

/**
 * What the user has: base ingredients of the foods they log, plus the
 * kitchen list (free text like "olive oil" or "tahini").
 */
export function knownSet(loggedNames: string[], pantry: string[]): Known {
  const loggedKeys = [
    ...new Set(loggedNames.map(ingredientKey).filter(Boolean)),
  ];
  return {
    logged: loggedKeys.map(words),
    kitchen: pantry.map(words),
    enough: loggedKeys.length >= MIN_KNOWN_FOODS,
  };
}

export type IngredientRef = {
  displayText: string;
  /** The matched food's name, when there is one. */
  foodName: string | null;
};

/** Whether the user has this ingredient, by its food or its own words. */
export function isFamiliar(ing: IngredientRef, known: Known): boolean {
  const name = plainName(ing.displayText);
  // "Very hot tap water" and "sea salt" are still water and salt.
  const last = name.split(" ").at(-1) ?? "";
  if (
    STAPLES.has(name) ||
    last === "water" ||
    last === "salt" ||
    (ing.foodName && STAPLES.has(ingredientKey(ing.foodName).replace(",", "")))
  )
    return true;
  const plain = new Set(words(name));
  const base = new Set(
    ing.foodName ? words(ingredientKey(ing.foodName)) : plain,
  );
  const full = new Set(ing.foodName ? words(ing.foodName) : plain);
  // "Chicken" logged covers "Chicken, breast" but not "Soup, stock, chicken";
  // a specific name like "greek yogurt" may match anywhere in the food name.
  const logged = known.logged.some(
    (k) => within(k, base) || (k.length >= 2 && within(k, full)),
  );
  return (
    logged || known.kitchen.some((k) => within(k, plain) || within(k, base))
  );
}

/** The ingredients the user has not logged, in recipe order. */
export function unfamiliar<T extends IngredientRef>(
  ingredients: T[],
  known: Known,
): T[] {
  if (!known.enough) return [];
  return ingredients.filter((i) => !isFamiliar(i, known));
}

/**
 * F: the share of a recipe's ingredients the user already eats, 0 to 1.
 * Neutral (0.5) until there is enough history to tell.
 */
export function familiarity(
  ingredients: IngredientRef[],
  known: Known,
): number {
  if (!known.enough || ingredients.length === 0) return 0.5;
  const have = ingredients.filter((i) => isFamiliar(i, known)).length;
  return have / ingredients.length;
}

/** The foods they log, as short names for a prompt: "olive oil", "egg". */
export function loggedLabels(loggedNames: string[], max = 40): string[] {
  const labels = loggedNames
    .map((n) => ingredientLabel(ingredientKey(n)))
    .filter(Boolean);
  return [...new Set(labels)].slice(0, max);
}
