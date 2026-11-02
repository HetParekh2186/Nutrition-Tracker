import type { TargetInput } from "@/lib/nutrition/dri";

import type { ProfileDTO } from "./types";

type ProfileLike = Pick<
  ProfileDTO,
  | "sex"
  | "birthDate"
  | "heightCm"
  | "weightKg"
  | "activityLevel"
  | "goal"
  | "proteinGPerKg"
  | "fatPctOfKcal"
>;

/** The inputs computeTargets needs, or null while the profile is incomplete. */
export function targetInputFrom(
  p: ProfileLike,
  onDate: string,
): TargetInput | null {
  if (
    !p.sex ||
    !p.birthDate ||
    !p.heightCm ||
    !p.weightKg ||
    !p.activityLevel ||
    !p.goal
  ) {
    return null;
  }
  return {
    sex: p.sex,
    birthDate: p.birthDate,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    activityLevel: p.activityLevel,
    goal: p.goal,
    proteinGPerKg: p.proteinGPerKg,
    fatPctOfKcal: p.fatPctOfKcal,
    onDate,
  };
}
