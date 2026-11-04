// Enum-like constants shared by the schema, API validation and client code.
// No imports, so client bundles can use them without pulling in Drizzle.

export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;

export const GOALS = ["lose", "maintain", "gain", "recomp"] as const;

export const EQUIPMENT = [
  "oven",
  "air_fryer",
  "instant_pot",
  "grill",
  "microwave",
  "blender",
] as const;

export const DIET_TYPES = [
  "omnivore",
  "vegetarian",
  "eggetarian",
  "vegan",
  "pescatarian",
] as const;

/**
 * The animal foods a diet can allow, one switch each. Diets are sets of
 * these, so "vegetarian who eats chicken and eggs" is just a set, not a
 * named type. "poultry" is poultry other than chicken.
 */
export const ANIMAL_FOODS = [
  "beef",
  "pork",
  "lamb",
  "chicken",
  "poultry",
  "fish",
  "shellfish",
  "eggs",
  "dairy",
  "honey",
] as const;

export const NUTRIENT_CATEGORIES = [
  "energy",
  "macro",
  "vitamin",
  "mineral",
  "lipid",
  "amino_acid",
  "other",
] as const;

export const FOOD_SOURCES = [
  "usda_foundation",
  "usda_sr_legacy",
  "usda_branded",
  "off",
  "custom",
] as const;

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

export const RECIPE_SOURCES = [
  "user",
  "ai_generated",
  "ai_adapted",
  "imported",
] as const;

export const LOGGED_VIA = [
  "search",
  "natural_language",
  "recent",
  "copy",
  "recipe",
  "cook_mode",
] as const;

export const INTERACTION_EVENTS = [
  "impression",
  "view",
  "save",
  "unsave",
  "skip",
  "cook_start",
  "cook_complete",
  "log",
  "rate",
] as const;

export type Equipment = (typeof EQUIPMENT)[number];
export type AnimalFood = (typeof ANIMAL_FOODS)[number];
export type DietType = (typeof DIET_TYPES)[number];
export type FoodSource = (typeof FOOD_SOURCES)[number];
export type MealSlot = (typeof MEAL_SLOTS)[number];
export type LoggedVia = (typeof LOGGED_VIA)[number];
export type InteractionEvent = (typeof INTERACTION_EVENTS)[number];
