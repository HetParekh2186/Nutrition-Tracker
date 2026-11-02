// Default calorie and macro targets (SPEC.md rules 4 and 5).

export type Sex = "male" | "female";
export type ActivityLevel =
  "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain" | "recomp";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  lose: -0.2,
  recomp: -0.1,
  maintain: 0,
  gain: 0.1,
};

export type BodyStats = {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
};

/** Mifflin-St Jeor basal metabolic rate, kcal/day. */
export function bmr({ sex, weightKg, heightCm, ageYears }: BodyStats): number {
  const s = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + s;
}

/** Maintenance calories: BMR times the activity factor. */
export function maintenanceKcal(
  stats: BodyStats,
  activity: ActivityLevel,
): number {
  return bmr(stats) * ACTIVITY_FACTORS[activity];
}

/** Daily calorie target, rounded to a whole kcal. */
export function calorieTarget(
  stats: BodyStats,
  activity: ActivityLevel,
  goal: Goal,
): number {
  return Math.round(
    maintenanceKcal(stats, activity) * (1 + GOAL_ADJUSTMENTS[goal]),
  );
}

export type MacroTargets = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

/**
 * Rule 5. Protein from body weight, fat as a share of calories, carbs take
 * whatever calories remain (never below zero).
 */
export function macroSplit(
  kcal: number,
  weightKg: number,
  proteinGPerKg = 1.8,
  fatPctOfKcal = 0.25,
): MacroTargets {
  const proteinG = proteinGPerKg * weightKg;
  const fatKcal = fatPctOfKcal * kcal;
  const carbKcal = Math.max(0, kcal - proteinG * 4 - fatKcal);
  return { kcal, proteinG, fatG: fatKcal / 9, carbsG: carbKcal / 4 };
}

/** Temporary fixed targets used until a profile exists (Phase 1). */
export const FALLBACK_MACROS: MacroTargets = {
  kcal: 2200,
  proteinG: 140,
  fatG: 70,
  carbsG: 250,
};
