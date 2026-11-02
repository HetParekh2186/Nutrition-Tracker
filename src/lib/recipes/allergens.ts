// "Never suggest" rules are hard (SPEC.md), and people write them as
// categories: "shellfish" has to catch shrimp, "tree nuts" has to catch
// cashews. Each category expands to the words that name its foods in
// recipes and in USDA food names.

const GROUPS: Record<string, string[]> = {
  shellfish: [
    "shellfish",
    "shrimp",
    "prawn",
    "crab",
    "lobster",
    "crayfish",
    "crawfish",
    "scallop",
    "clam",
    "mussel",
    "oyster",
    "crustacean",
    "mollusk",
    "squid",
    "octopus",
  ],
  fish: [
    "fish",
    "salmon",
    "tuna",
    "cod",
    "tilapia",
    "trout",
    "halibut",
    "mackerel",
    "sardine",
    "anchovy",
    "anchovies",
    "haddock",
    "pollock",
    "snapper",
    "bass",
  ],
  "tree nuts": [
    "almond",
    "cashew",
    "walnut",
    "pecan",
    "pistachio",
    "hazelnut",
    "macadamia",
    "brazil nut",
    "pine nut",
    "nuts",
  ],
  peanuts: ["peanut"],
  dairy: [
    "milk",
    "cheese",
    "cheddar",
    "parmesan",
    "mozzarella",
    "feta",
    "ricotta",
    "paneer",
    "butter",
    "cream",
    "yogurt",
    "yoghurt",
    "ghee",
    "whey",
    "kefir",
  ],
  gluten: [
    "wheat",
    "flour",
    "bread",
    "pasta",
    "spaghetti",
    "penne",
    "noodle",
    "barley",
    "rye",
    "couscous",
    "seitan",
    "pita",
    "tortillas, flour",
  ],
  eggs: ["egg"],
  soy: ["soy", "soya", "tofu", "edamame", "tempeh", "tamari", "miso"],
  sesame: ["sesame", "tahini"],
  pork: [
    "pork",
    "bacon",
    "ham",
    "prosciutto",
    "pancetta",
    "chorizo",
    "sausage",
  ],
  beef: ["beef", "steak", "sirloin", "brisket", "ribeye"],
};

const ALIASES: Record<string, string> = {
  "shell fish": "shellfish",
  seafood: "shellfish",
  nuts: "tree nuts",
  "tree nut": "tree nuts",
  peanut: "peanuts",
  milk: "dairy",
  lactose: "dairy",
  egg: "eggs",
  wheat: "gluten",
};

/**
 * The words to block for one rule: its category's members, or the rule
 * itself. Plant lookalikes (peanut butter, coconut milk) are handled by
 * dropping them before matching, see lookalikeFree.
 */
export function expandExclusion(term: string): string[] {
  const t = term.trim().toLowerCase();
  const group = GROUPS[ALIASES[t] ?? t];
  // Singular forms catch plurals because matches anchor only at the start.
  return [...new Set([t.replace(/s$/, ""), ...(group ?? [])])];
}

export function expandExclusions(terms: string[]): string[] {
  return [...new Set(terms.flatMap(expandExclusion))];
}

/** Word-start regex source for Postgres (\m) or JavaScript (\b). */
export function wordStartPattern(word: string, flavour: "pg" | "js"): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const guard = NOT_FOLLOWED_BY[word] ? `(?!${NOT_FOLLOWED_BY[word]})` : "";
  return `${flavour === "pg" ? "\\m" : "\\b"}${escaped}${guard}`;
}

// Words that start like an allergen but are not one. Over-blocking is the
// safe direction for a hard rule; these are just the needless cases.
const NOT_FOLLOWED_BY: Record<string, string> = {
  egg: "plant",
  butter: "nut",
};
