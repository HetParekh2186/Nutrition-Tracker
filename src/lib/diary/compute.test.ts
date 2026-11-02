import { describe, expect, it } from "vitest";

import { N } from "@/lib/nutrition/catalog";
import { sumNutrients } from "@/lib/nutrition/math";

import { entryNutrients } from "./compute";

const foods = new Map([[1, { [N.protein]: 31.0, [N.energy]: 165 }]]);
const recipes = new Map([["r1", { [N.protein]: 56.825 }]]);

describe("entryNutrients", () => {
  it("scales a food entry by grams", () => {
    const m = entryNutrients(
      { foodId: 1, recipeId: null, quantityG: 180, servings: null },
      foods,
      recipes,
    );
    expect(m[N.protein]).toBeCloseTo(55.8, 10);
    expect(m[N.energy]).toBeCloseTo(297, 10);
  });

  it("multiplies a recipe entry by servings", () => {
    const m = entryNutrients(
      { foodId: null, recipeId: "r1", quantityG: null, servings: 1.5 },
      foods,
      recipes,
    );
    expect(m[N.protein]).toBeCloseTo(85.2375, 10);
  });

  it("returns nothing for an unknown food", () => {
    expect(
      entryNutrients(
        { foodId: 99, recipeId: null, quantityG: 100, servings: null },
        foods,
        recipes,
      ),
    ).toEqual({});
  });

  it("a day of entries matches a hand calculation", () => {
    // 180 g chicken + 1.5 servings of the worked recipe.
    const day = sumNutrients([
      entryNutrients(
        { foodId: 1, recipeId: null, quantityG: 180, servings: null },
        foods,
        recipes,
      ),
      entryNutrients(
        { foodId: null, recipeId: "r1", quantityG: null, servings: 1.5 },
        foods,
        recipes,
      ),
    ]);
    expect(day.amounts[N.protein]).toBeCloseTo(55.8 + 85.2375, 10);
    expect(day.coverage[N.energy]).toEqual({ known: 1, total: 2 });
  });
});
