import { describe, expect, it } from "vitest";

import {
  bmr,
  calorieTarget,
  macroSplit,
  maintenanceKcal,
  type BodyStats,
} from "./targets";

// SPEC.md rule 4 example: male, 75 kg, 178 cm, age 20, moderate, maintain.
const SPEC_MALE: BodyStats = {
  sex: "male",
  weightKg: 75,
  heightCm: 178,
  ageYears: 20,
};

describe("rule 4: Mifflin-St Jeor", () => {
  it("BMR for the worked example is 1767.5 kcal", () => {
    expect(bmr(SPEC_MALE)).toBe(1767.5);
  });

  it("uses -161 for female", () => {
    expect(bmr({ ...SPEC_MALE, sex: "female" })).toBe(1767.5 - 5 - 161);
  });

  it("maintenance at moderate activity is 2739.6 kcal", () => {
    expect(maintenanceKcal(SPEC_MALE, "moderate")).toBeCloseTo(2739.625, 10);
  });

  it("maintain goal rounds to 2740", () => {
    expect(calorieTarget(SPEC_MALE, "moderate", "maintain")).toBe(2740);
  });

  it.each([
    ["lose", Math.round(2739.625 * 0.8)],
    ["recomp", Math.round(2739.625 * 0.9)],
    ["gain", Math.round(2739.625 * 1.1)],
  ] as const)("applies the %s adjustment", (goal, expected) => {
    expect(calorieTarget(SPEC_MALE, "moderate", goal)).toBe(expected);
  });

  it.each([
    ["sedentary", 1.2],
    ["light", 1.375],
    ["active", 1.725],
    ["very_active", 1.9],
  ] as const)("uses the %s factor", (level, factor) => {
    expect(maintenanceKcal(SPEC_MALE, level)).toBeCloseTo(1767.5 * factor, 10);
  });
});

describe("rule 5: default macro split", () => {
  const split = macroSplit(2740, 75);

  it("protein is 1.8 g/kg: 135 g", () => {
    expect(split.proteinG).toBe(135);
  });

  it("fat is 25% of kcal: 76.1 g", () => {
    expect(split.fatG).toBeCloseTo(685 / 9, 10);
    expect(split.fatG.toFixed(1)).toBe("76.1");
  });

  it("carbs take the rest: 378.8 g", () => {
    expect(split.carbsG).toBeCloseTo(1515 / 4, 10);
    expect(split.carbsG.toFixed(1)).toBe("378.8");
  });

  it("honours custom protein and fat settings", () => {
    const custom = macroSplit(2000, 80, 2.2, 0.3);
    expect(custom.proteinG).toBeCloseTo(176, 10);
    expect(custom.fatG).toBeCloseTo(600 / 9, 10);
    expect(custom.carbsG).toBeCloseTo((2000 - 704 - 600) / 4, 10);
  });

  it("never returns negative carbs", () => {
    expect(macroSplit(1000, 120).carbsG).toBe(0);
  });
});
