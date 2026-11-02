import { describe, expect, it } from "vitest";

import { N } from "./catalog";
import {
  computeTargets,
  DRI,
  driGroup,
  mergeTargets,
  type TargetInput,
} from "./dri";

// SPEC.md rules 4 and 5: male, 75 kg, 178 cm, age 20, moderate, maintain.
const SPEC_PROFILE: TargetInput = {
  sex: "male",
  birthDate: "2006-01-15",
  heightCm: 178,
  weightKg: 75,
  activityLevel: "moderate",
  goal: "maintain",
  proteinGPerKg: 1.8,
  fatPctOfKcal: 0.25,
  onDate: "2026-11-02",
};

describe("data/dri.json", () => {
  it("parses and covers both sexes from 14 up", () => {
    for (const sex of ["male", "female"] as const) {
      for (const age of [14, 18, 19, 30, 31, 50, 51, 70, 71, 99]) {
        expect(() => driGroup(sex, age)).not.toThrow();
      }
    }
  });

  it("has min at or below max everywhere", () => {
    for (const group of DRI.groups) {
      for (const range of Object.values(group.values)) {
        if (range.min !== undefined && range.max !== undefined) {
          expect(range.min).toBeLessThanOrEqual(range.max);
        }
      }
    }
  });

  it("matches NIH values for spot checks", () => {
    expect(driGroup("male", 20).values["1162"]).toEqual({ min: 90, max: 2000 });
    expect(driGroup("female", 35).values["1089"]).toEqual({ min: 18, max: 45 });
    expect(driGroup("female", 60).values["1089"]?.min).toBe(8);
    expect(driGroup("male", 75).values["1114"]?.min).toBe(20);
    expect(driGroup("female", 55).values["1087"]?.min).toBe(1200);
  });

  it("uses the youngest group for under-14s", () => {
    expect(driGroup("male", 12).ageMin).toBe(14);
  });
});

describe("computeTargets", () => {
  const t = computeTargets(SPEC_PROFILE);

  it("reproduces the spec's worked example", () => {
    expect(t[N.energy]).toEqual({ min: 2740, max: null, source: "computed" });
    expect(t[N.protein]?.min).toBe(135);
    expect(t[N.fat]?.min).toBeCloseTo(76.11, 2);
    expect(t[N.carbs]?.min).toBeCloseTo(378.75, 2);
  });

  it("caps saturated fat and added sugars at 10% of calories", () => {
    expect(t[1258]?.max).toBeCloseTo(274 / 9, 5);
    expect(t[N.addedSugars]?.max).toBeCloseTo(68.5, 5);
  });

  it("adds DRI micronutrients as defaults", () => {
    expect(t[1162]).toEqual({ min: 90, max: 2000, source: "default" });
    expect(t[N.fiber]?.min).toBe(38);
  });

  it("scales amino acids by body weight", () => {
    expect(t[1213]?.min).toBeCloseTo((42 * 75) / 1000, 10); // leucine
  });

  it("applies the goal adjustment", () => {
    const lose = computeTargets({ ...SPEC_PROFILE, goal: "lose" });
    expect(lose[N.energy]?.min).toBe(Math.round(2739.625 * 0.8));
  });
});

describe("mergeTargets", () => {
  it("keeps user edits and replaces everything else", () => {
    const recomputed = computeTargets(SPEC_PROFILE);
    const merged = mergeTargets(
      {
        [N.protein]: { min: 160, max: null, source: "user" },
        [N.energy]: { min: 2500, max: null, source: "computed" },
      },
      recomputed,
    );
    expect(merged[N.protein]).toEqual({ min: 160, max: null, source: "user" });
    expect(merged[N.energy]?.min).toBe(2740);
  });
});
