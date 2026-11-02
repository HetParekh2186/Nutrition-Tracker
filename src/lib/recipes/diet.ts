// Which diets a recipe suits, from its ingredient names. Used to tag
// recipes on save so suggestions can respect a user's diet type, which is
// a hard rule (SPEC.md "Candidates").
//
// Diet meanings follow common Indian usage, which the eggetarian option
// implies: vegetarian allows dairy but not eggs; eggetarian allows both.

const MEAT =
  /\b(chicken|beef|pork|turkey|lamb|mutton|goat|veal|duck|bacon|ham|sausages?|prosciutto|pepperoni|salami|chorizo|steak|sirloin|brisket|ribeye|tenderloin|pancetta|lard|mince|meatballs?|broth, (chicken|beef)|(chicken|beef) (broth|stock))\b/i;
const FISH =
  /\b(fish|salmon|tuna|cod|tilapia|trout|halibut|mackerel|sardines?|anchov(y|ies)|shrimps?|prawns?|crab|lobster|scallops?|clams?|mussels?|oysters?|squid|seafood)\b/i;
const DAIRY =
  /\b(milk|cheese|cheddar|parmesan|mozzarella|feta|ricotta|paneer|yogh?urt|butter|cream|ghee|whey|kefir|buttermilk)\b/i;
const EGG = /\beggs?\b/i;
const OTHER_ANIMAL = /\b(honey|gelatin)\b/i;

// Plant products whose names contain an animal word.
const PLANT_LOOKALIKES =
  /\b(coconut|almond|soy|soya|oat|rice|cashew|peanut|sunflower|cocoa|shea|apple|nut)\s+(milk|cream|yogh?urt|butter|cheese)\b|\bbutter(nut|milk)? squash\b|\b(cream of tartar|egg ?plant)\b/gi;

export const DIET_TAGS = [
  "vegan",
  "vegetarian",
  "eggetarian",
  "pescatarian",
] as const;
export type DietTag = (typeof DIET_TAGS)[number];

export function dietTagsFor(ingredientNames: string[]): DietTag[] {
  const text = ingredientNames.join(" | ").replace(PLANT_LOOKALIKES, " ");
  const meat = MEAT.test(text);
  const fish = FISH.test(text);
  const dairy = DAIRY.test(text);
  const egg = EGG.test(text);
  const other = OTHER_ANIMAL.test(text);

  const tags: DietTag[] = [];
  if (!meat) tags.push("pescatarian");
  if (!meat && !fish) tags.push("eggetarian");
  if (!meat && !fish && !egg) tags.push("vegetarian");
  if (!meat && !fish && !egg && !dairy && !other) tags.push("vegan");
  return tags;
}

/** Diet tags on a recipe, merged with its other tags (old diet tags dropped). */
export function withDietTags(
  tags: string[],
  ingredientNames: string[],
): string[] {
  const rest = tags.filter(
    (t) => !(DIET_TAGS as readonly string[]).includes(t),
  );
  return [...new Set([...rest, ...dietTagsFor(ingredientNames)])];
}

/** Does a recipe with these tags suit a diet type? Omnivores eat anything. */
export function suitsDiet(tags: string[], dietType: string | null): boolean {
  if (!dietType || dietType === "omnivore") return true;
  return tags.includes(dietType);
}
