// Default nutrient targets (SPEC.md rules 4 to 6): calories and macros from
// body stats, micronutrients from the NIH DRIs in data/dri.json.

import { z } from "zod";

import driJson from "../../../data/dri.json";

import { N } from "./catalog";
import { ageOn } from "./dates";
import {
  calorieTarget,
  macroSplit,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "./targets";

const Range = z.object({
  min: z.number().nonnegative().optional(),
  max: z.number().nonnegative().optional(),
});

const DriFile = z.object({
  aminoAcidsMgPerKg: z.record(z.string(), z.number().positive()),
  groups: z
    .array(
      z.object({
        sex: z.enum(["male", "female"]),
        ageMin: z.number().int(),
        ageMax: z.number().int(),
        values: z.record(z.string(), Range),
      }),
    )
    .min(1),
});

export type DriTable = z.infer<typeof DriFile>;

export const DRI: DriTable = DriFile.parse(driJson);

export type TargetSource = "default" | "computed" | "user";

export type ComputedTarget = {
  min: number | null;
  max: number | null;
  source: Exclude<TargetSource, "user">;
};

export type TargetInput = {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  proteinGPerKg: number;
  fatPctOfKcal: number;
  /** "YYYY-MM-DD"; the date ages are measured on. */
  onDate: string;
};

/** The DRI group for a sex and age. Under-14s use the 14 to 18 group. */
export function driGroup(sex: Sex, age: number, table: DriTable = DRI) {
  const groups = table.groups.filter((g) => g.sex === sex);
  const clamped = Math.max(age, Math.min(...groups.map((g) => g.ageMin)));
  const group = groups.find((g) => clamped >= g.ageMin && clamped <= g.ageMax);
  if (!group) throw new Error(`No DRI group for ${sex}, age ${age}`);
  return group;
}

/**
 * Every default target for a profile:
 * - energy, protein, fat and carbs by rules 4 and 5 (source "computed")
 * - saturated fat and added sugars capped at 10% of calories (computed)
 * - vitamins, minerals, fiber and ALA from the DRIs (source "default")
 * - amino acids from per-kg RDAs (default)
 */
export function computeTargets(
  input: TargetInput,
  table: DriTable = DRI,
): Record<number, ComputedTarget> {
  const age = ageOn(input.birthDate, input.onDate);
  const kcal = calorieTarget(
    {
      sex: input.sex,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      ageYears: age,
    },
    input.activityLevel,
    input.goal,
  );
  const macros = macroSplit(
    kcal,
    input.weightKg,
    input.proteinGPerKg,
    input.fatPctOfKcal,
  );

  const out: Record<number, ComputedTarget> = {};
  const computed = (id: number, min: number | null, max: number | null) => {
    out[id] = { min, max, source: "computed" };
  };
  computed(N.energy, kcal, null);
  computed(N.protein, macros.proteinG, null);
  computed(N.fat, macros.fatG, null);
  computed(N.carbs, macros.carbsG, null);
  computed(1258, null, (0.1 * kcal) / 9); // saturated fat
  computed(N.addedSugars, null, (0.1 * kcal) / 4);

  for (const [id, range] of Object.entries(
    driGroup(input.sex, age, table).values,
  )) {
    out[Number(id)] = {
      min: range.min ?? null,
      max: range.max ?? null,
      source: "default",
    };
  }
  for (const [id, mgPerKg] of Object.entries(table.aminoAcidsMgPerKg)) {
    out[Number(id)] = {
      min: (mgPerKg * input.weightKg) / 1000,
      max: null,
      source: "default",
    };
  }
  return out;
}

/**
 * Merge recomputed targets with stored ones: rows the user edited
 * (source "user") are kept, everything else is replaced.
 */
export function mergeTargets(
  stored: Record<
    number,
    { min: number | null; max: number | null; source: TargetSource }
  >,
  recomputed: Record<number, ComputedTarget>,
): Record<
  number,
  { min: number | null; max: number | null; source: TargetSource }
> {
  const out: Record<
    number,
    { min: number | null; max: number | null; source: TargetSource }
  > = { ...recomputed };
  for (const [id, t] of Object.entries(stored)) {
    if (t.source === "user") out[Number(id)] = t;
  }
  return out;
}
