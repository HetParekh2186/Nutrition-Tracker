import { describe, expect, it } from "vitest";

import {
  formatCookQuantity,
  scaledIngredientText,
  shownFactor,
} from "./display";

describe("scaledIngredientText", () => {
  it("drops gram amounts, which the weight column shows", () => {
    expect(scaledIngredientText("450 g chicken breast", 1 / 3)).toBe(
      "chicken breast",
    );
    expect(scaledIngredientText("450 g chicken breast", 1)).toBe(
      "chicken breast",
    );
    expect(scaledIngredientText("1.5 kg potatoes", 2)).toBe("potatoes");
  });

  it("scales other units with cook-style fractions", () => {
    expect(scaledIngredientText("1 tbsp oil", 1 / 3)).toBe("⅓ tbsp oil");
    expect(scaledIngredientText("2 cloves garlic", 0.5)).toBe("1 clove garlic");
    expect(scaledIngredientText("1 can black beans", 2)).toBe(
      "2 cans black beans",
    );
    expect(scaledIngredientText("1 1/2 cups rice", 2)).toBe("3 cups rice");
    expect(scaledIngredientText("½ tsp salt", 3)).toBe("1½ tsp salt");
  });

  it("scales a bare count", () => {
    expect(scaledIngredientText("1 onion", 1 / 3)).toBe("⅓ onion");
    expect(scaledIngredientText("3 eggs", 2)).toBe("6 eggs");
  });

  it("keeps the text at the recipe's own servings", () => {
    expect(scaledIngredientText("1 tbsp oil", 1)).toBe("1 tbsp oil");
  });

  it("leaves lines without a leading amount alone", () => {
    expect(scaledIngredientText("Juice of 1 lime", 2)).toBe("Juice of 1 lime");
    expect(scaledIngredientText("salt to taste", 2)).toBe("salt to taste");
  });

  it("does not read a word that starts with a unit as the unit", () => {
    expect(scaledIngredientText("2 large eggs", 0.5)).toBe("1 large eggs");
    expect(scaledIngredientText("2 garlic cloves", 0.5)).toBe(
      "1 garlic cloves",
    );
  });
});

describe("formatCookQuantity", () => {
  it("uses fractions cooks use, else one decimal", () => {
    expect(formatCookQuantity(0.25)).toBe("¼");
    expect(formatCookQuantity(2.67)).toBe("2⅔");
    expect(formatCookQuantity(2.4)).toBe("2.4");
    expect(formatCookQuantity(2.99)).toBe("3");
  });
});

describe("shownFactor", () => {
  it("reads the scale from the weights on screen", () => {
    expect(shownFactor({ quantityG: 450, scaledG: 150 })).toBeCloseTo(1 / 3);
    expect(shownFactor({ quantityG: 0, scaledG: 0 })).toBe(1);
  });
});
