import { describe, expect, it } from "vitest";

import { N } from "@/lib/nutrition/catalog";

import {
  applySubstitutions,
  substitutionDiff,
  type CookIngredient,
} from "./substitute";
import { convertUnits, densityFromPortion } from "./units";

// Flow B: "can I use Greek yogurt instead of cream?"
const CREAM = 1;
const YOGURT = 2;
const CHICKEN = 3;
const foods = new Map([
  [CREAM, { [N.energy]: 340, [N.protein]: 2.8, [N.carbs]: 2.7, [N.fat]: 36 }],
  [YOGURT, { [N.energy]: 59, [N.protein]: 10.2, [N.carbs]: 3.6, [N.fat]: 0.4 }],
  [CHICKEN, { [N.energy]: 120, [N.protein]: 22.5, [N.carbs]: 0, [N.fat]: 2.6 }],
]);
const ingredients: CookIngredient[] = [
  { id: 10, foodId: CHICKEN, quantityG: 600, displayText: "600 g chicken" },
  { id: 11, foodId: CREAM, quantityG: 100, displayText: "100 ml cream" },
];

describe("applySubstitutions", () => {
  it("replaces the food and weight, latest swap wins", () => {
    const out = applySubstitutions(ingredients, [
      { ingredientId: 11, newFoodId: 99, quantityG: 50, reason: "a" },
      {
        ingredientId: 11,
        newFoodId: YOGURT,
        quantityG: 120,
        reason: "b",
        displayText: "120 g Greek yogurt",
      },
    ]);
    expect(out[1]).toMatchObject({
      foodId: YOGURT,
      quantityG: 120,
      displayText: "120 g Greek yogurt",
    });
    expect(out[0]).toEqual(ingredients[0]);
  });
});

describe("substitutionDiff", () => {
  it("computes the per-serving change from USDA data", () => {
    const diff = substitutionDiff(
      ingredients,
      [],
      {
        ingredientId: 11,
        newFoodId: YOGURT,
        quantityG: 120,
        reason: "lighter",
      },
      4,
      foods,
    );
    // Cream: 340 kcal and 36 g fat per 100 g, over 4 servings.
    expect(diff.before.kcal).toBeCloseTo((120 * 6 + 340) / 4, 9);
    expect(diff.after.kcal).toBeCloseTo((120 * 6 + 59 * 1.2) / 4, 9);
    expect(diff.delta.fatG).toBeCloseTo((0.4 * 1.2 - 36) / 4, 9);
    expect(diff.delta.proteinG).toBeGreaterThan(0);
  });

  it("starts from already accepted swaps", () => {
    const accepted = [
      { ingredientId: 11, newFoodId: YOGURT, quantityG: 120, reason: "x" },
    ];
    const diff = substitutionDiff(
      ingredients,
      accepted,
      { ingredientId: 10, newFoodId: CHICKEN, quantityG: 300, reason: "less" },
      4,
      foods,
    );
    expect(diff.before.kcal).toBeCloseTo((120 * 6 + 59 * 1.2) / 4, 9);
    expect(diff.delta.kcal).toBeCloseTo((-120 * 3) / 4, 9);
  });
});

describe("convertUnits", () => {
  it("converts mass and volume exactly", () => {
    expect(convertUnits(1, "lb", "g")).toEqual({ quantity: 454, unit: "g" });
    expect(convertUnits(3, "tsp", "tbsp")?.quantity).toBeCloseTo(1, 2);
    expect(convertUnits(1, "cup", "ml")).toEqual({ quantity: 237, unit: "ml" });
  });

  it("uses food density across mass and volume", () => {
    const flour = densityFromPortion("1 cup", 125)!;
    const r = convertUnits(1, "cup", "g", flour)!;
    expect(r.quantity).toBe(125);
    expect(r.note).toMatch(/USDA/);
  });

  it("falls back to water density and says so", () => {
    const r = convertUnits(100, "g", "ml")!;
    expect(r.quantity).toBe(100);
    expect(r.note).toMatch(/water/);
  });

  it("returns null for unknown units", () => {
    expect(convertUnits(1, "pinch", "g")).toBeNull();
  });
});

describe("densityFromPortion", () => {
  it("reads cup and tbsp portions", () => {
    expect(densityFromPortion("1 tbsp", 14.7868)).toBeCloseTo(1, 3);
    expect(densityFromPortion("0.5 cup, chopped", 118.294)).toBeCloseTo(1, 3);
    expect(densityFromPortion("1 large", 50)).toBeNull();
  });
});
