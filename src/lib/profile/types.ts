// Profile, preference and target shapes for the API. Client-safe.

import type { AnimalFood, DietType, Equipment } from "@/lib/db/enums";
import type { NutrientCategory, NutrientUnit } from "@/lib/nutrition/catalog";
import type { TargetSource } from "@/lib/nutrition/dri";
import type { ActivityLevel, Goal, Sex } from "@/lib/nutrition/targets";

export type ProfileDTO = {
  sex: Sex | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  proteinGPerKg: number;
  fatPctOfKcal: number;
  unitSystem: "metric" | "imperial";
  timezone: string;
  onboarded: boolean;
  isDemo: boolean;
};

export type PreferencesDTO = {
  /** The preset that eats matches exactly; null for a custom diet. */
  dietType: DietType | null;
  /** Animal foods the user eats. The hard diet rule. */
  eats: AnimalFood[];
  excludedIngredients: string[];
  dislikedIngredients: string[];
  likedCuisines: string[];
  maxCookMinutes: number | null;
  equipment: Equipment[];
  spiceLevel: number | null;
  notes: string | null;
  /** Ingredients in their kitchen that they do not log. */
  pantry: string[];
};

export type TargetRowDTO = {
  nutrientId: number;
  name: string;
  unit: NutrientUnit;
  category: NutrientCategory;
  min: number | null;
  max: number | null;
  source: TargetSource;
  /** What recomputing would give, so the UI can offer a reset. */
  computed: { min: number | null; max: number | null } | null;
};
