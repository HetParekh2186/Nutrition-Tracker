// Profile, preference and target shapes for the API. Client-safe.

import type { DIET_TYPES } from "@/lib/db/schema";
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
  dietType: (typeof DIET_TYPES)[number] | null;
  excludedIngredients: string[];
  dislikedIngredients: string[];
  likedCuisines: string[];
  maxCookMinutes: number | null;
  equipment: string[];
  spiceLevel: number | null;
  notes: string | null;
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
