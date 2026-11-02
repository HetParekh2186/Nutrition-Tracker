import { describe, expect, it } from "vitest";

import { N } from "@/lib/nutrition/catalog";

import {
  macroDeviation,
  needsRevision,
  recipeNutrition,
  scaleQuantity,
} from "./compute";

// SPEC.md rule 2 worked example: 600 g chicken, 300 g dry rice, 200 g
// Greek yogurt, 4 servings.
const foods = new Map([
  [1, { [N.protein]: 31.0, [N.energy]: 165 }],
  [2, { [N.protein]: 7.1, [N.energy]: 365 }],
  [3, { [N.protein]: 10.0, [N.energy]: 59 }],
]);

describe("recipeNutrition", () => {
  it("matches the spec's worked example", () => {
    const r = recipeNutrition(
      [
        { foodId: 1, quantityG: 600 },
        { foodId: 2, quantityG: 300 },
        { foodId: 3, quantityG: 200 },
      ],
      4,
      foods,
    );
    expect(r.macros.proteinG).toBeCloseTo(56.825, 10);
    expect(r.unmatched).toBe(0);
  });

  it("leaves unmatched ingredients out and counts them", () => {
    const r = recipeNutrition(
      [
        { foodId: 1, quantityG: 600 },
        { foodId: null, quantityG: 5 },
        { foodId: 99, quantityG: 10 },
      ],
      4,
      foods,
    );
    expect(r.macros.proteinG).toBeCloseTo(46.5, 10);
    expect(r.unmatched).toBe(2);
  });
});

describe("scaleQuantity", () => {
  it("scales from 4 servings to 2", () => {
    expect(scaleQuantity(600, 4, 2)).toBe(300);
    expect(scaleQuantity(300, 4, 6)).toBe(450);
  });
});

describe("revision check", () => {
  const target = { kcal: 745, proteinG: 50, carbsG: 80, fatG: 25 };

  it("measures deviation per macro", () => {
    const d = macroDeviation(
      { kcal: 730, proteinG: 45, carbsG: 70, fatG: 30, fiberG: 0 },
      target,
    );
    expect(d.kcal).toBeCloseTo(15 / 745, 10);
    expect(d.fatG).toBeCloseTo(0.2, 10);
  });

  it("revises only when a macro is more than 10% off", () => {
    expect(
      needsRevision(
        { kcal: 745, proteinG: 54, carbsG: 74, fatG: 26, fiberG: 0 },
        target,
      ),
    ).toBe(false);
    expect(
      needsRevision(
        { kcal: 730, proteinG: 45, carbsG: 70, fatG: 30, fiberG: 0 },
        target,
      ),
    ).toBe(true);
  });

  it("ignores macros without a target", () => {
    expect(
      needsRevision(
        { kcal: 500, proteinG: 10, carbsG: 0, fatG: 0, fiberG: 0 },
        { kcal: 520 },
      ),
    ).toBe(false);
  });
});
