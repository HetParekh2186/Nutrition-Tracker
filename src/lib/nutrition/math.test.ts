import { describe, expect, it } from "vitest";

import { N } from "./catalog";
import {
  amountForGrams,
  atwaterKcal,
  energyOf,
  multiplyNutrients,
  recipePerServing,
  remaining,
  scaleNutrients,
  sumNutrients,
  withEstimatedEnergy,
} from "./math";

// Worked examples from SPEC.md "Nutrition calculation rules".
const CHICKEN = { [N.protein]: 31.0 };
const DRY_RICE = { [N.protein]: 7.1 };
const GREEK_YOGURT = { [N.protein]: 10.0 };

describe("rule 1: one logged food", () => {
  it("180 g chicken at 31.0 g/100 g is 55.8 g protein", () => {
    expect(amountForGrams(31.0, 180)).toBeCloseTo(55.8, 10);
  });

  it("scales every nutrient a food has and nothing else", () => {
    expect(scaleNutrients({ [N.protein]: 31, [N.fat]: 3.6 }, 50)).toEqual({
      [N.protein]: 15.5,
      [N.fat]: 1.8,
    });
  });

  it("zero grams is zero, not unknown", () => {
    expect(scaleNutrients(CHICKEN, 0)).toEqual({ [N.protein]: 0 });
  });
});

describe("rule 2: recipe per serving", () => {
  const recipe = [
    { per100g: CHICKEN, grams: 600 },
    { per100g: DRY_RICE, grams: 300 },
    { per100g: GREEK_YOGURT, grams: 200 },
  ];

  it("4 servings of the worked recipe is 56.8 g protein each", () => {
    const { amounts } = recipePerServing(recipe, 4);
    // 186.0 + 21.3 + 20.0 = 227.3; 227.3 / 4 = 56.825
    expect(amounts[N.protein]).toBeCloseTo(56.825, 10);
  });

  it("logging 1.5 servings is 85.2 g protein", () => {
    const { amounts } = recipePerServing(recipe, 4);
    expect(multiplyNutrients(amounts, 1.5)[N.protein]).toBeCloseTo(85.24, 2);
  });

  it("tracks coverage per ingredient", () => {
    const { coverage } = recipePerServing(
      [
        { per100g: { [N.protein]: 31, [N.fat]: 3 }, grams: 100 },
        { per100g: { [N.protein]: 7 }, grams: 100 },
      ],
      2,
    );
    expect(coverage[N.protein]).toEqual({ known: 2, total: 2 });
    expect(coverage[N.fat]).toEqual({ known: 1, total: 2 });
  });

  it("rejects zero or negative servings", () => {
    expect(() => recipePerServing(recipe, 0)).toThrow(RangeError);
  });
});

describe("rule 3: totals and remaining", () => {
  it("sums entries and keeps unknown nutrients out of the totals", () => {
    const totals = sumNutrients([
      { [N.protein]: 55.8, 1185: 10 },
      { [N.protein]: 6.3 },
      { [N.protein]: 0.3, 1185: 52 },
    ]);
    expect(totals.amounts[N.protein]).toBeCloseTo(62.4, 10);
    expect(totals.amounts[1185]).toBe(62);
    expect(totals.coverage[1185]).toEqual({ known: 2, total: 3 });
    expect(totals.amounts[N.fat]).toBeUndefined();
  });

  it("an empty day has no totals", () => {
    expect(sumNutrients([])).toEqual({
      amounts: {},
      coverage: {},
      itemCount: 0,
    });
  });

  it("remaining goes negative when over", () => {
    expect(remaining(2740, 2000)).toBe(740);
    expect(remaining(2740, 2860)).toBe(-120);
  });
});

describe("rule 7: missing energy", () => {
  it("uses stored energy when present", () => {
    expect(energyOf({ [N.energy]: 165, [N.protein]: 31 })).toEqual({
      kcal: 165,
      estimated: false,
    });
  });

  it("estimates with Atwater factors and flags it", () => {
    expect(atwaterKcal(10, 20, 5)).toBe(165);
    expect(energyOf({ [N.protein]: 10, [N.carbs]: 20, [N.fat]: 5 })).toEqual({
      kcal: 165,
      estimated: true,
    });
  });

  it("returns null when macros are missing too", () => {
    expect(energyOf({ [N.protein]: 10 })).toBeNull();
  });

  it("fills energy into a food map only when missing", () => {
    expect(
      withEstimatedEnergy({ [N.protein]: 10, [N.carbs]: 20, [N.fat]: 5 }),
    ).toEqual({
      map: { [N.protein]: 10, [N.carbs]: 20, [N.fat]: 5, [N.energy]: 165 },
      energyEstimated: true,
    });
    const stored = { [N.energy]: 100 };
    expect(withEstimatedEnergy(stored)).toEqual({
      map: stored,
      energyEstimated: false,
    });
  });
});
