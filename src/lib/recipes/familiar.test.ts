import { describe, expect, it } from "vitest";

import {
  familiarity,
  ingredientKey,
  ingredientLabel,
  knownSet,
  loggedLabels,
  plainName,
  unfamiliar,
} from "./familiar";

const LOGGED = [
  "Egg, whole, raw, fresh",
  "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
  "Rice, white, long-grain, regular, enriched, cooked",
  "Spinach, raw",
  "Oil, olive, salad or cooking",
  "Onions, raw",
  "Greek yogurt",
];

const ing = (displayText: string, foodName: string | null = null) => ({
  displayText,
  foodName,
});

describe("ingredient keys", () => {
  it("uses the USDA head, singular", () => {
    expect(ingredientKey("Onions, raw")).toBe("onion");
    expect(ingredientKey("Tomatoes, red, ripe, raw")).toBe("tomato");
    expect(ingredientKey("Lentils, mature seeds, raw")).toBe("lentil");
  });

  it("keeps the kind for broad heads", () => {
    expect(ingredientKey("Oil, olive, salad or cooking")).toBe("oil, olive");
    expect(ingredientKey("Cheese, cheddar")).toBe("cheese, cheddar");
    expect(ingredientKey("Beans, black, mature seeds")).toBe("bean, black");
    expect(ingredientLabel("oil, olive")).toBe("olive oil");
    expect(ingredientLabel("spice, cumin")).toBe("cumin");
    expect(ingredientLabel(ingredientKey("Nuts, almonds"))).toBe("almond");
    expect(ingredientLabel(ingredientKey("Fish, salmon, Atlantic"))).toBe(
      "salmon",
    );
  });

  it("drops parentheses", () => {
    expect(
      ingredientKey("Chickpeas (garbanzo beans, bengal gram), canned"),
    ).toBe("chickpea");
  });
});

describe("plain names", () => {
  it("drops amounts, units and prep notes", () => {
    expect(plainName("2 cloves garlic, minced")).toBe("garlic");
    expect(plainName("1 can (400 g) chickpeas, drained")).toBe("chickpeas");
    expect(plainName("200g chicken breast, diced")).toBe("chicken breast");
    expect(plainName("½ tsp ground cumin")).toBe("ground cumin");
  });
});

describe("what is new to the user", () => {
  const known = knownSet(LOGGED, ["tahini"]);

  it("covers other forms of a logged food", () => {
    expect(
      unfamiliar(
        [
          ing("2 eggs", "Egg, whole, cooked, scrambled"),
          ing("1 onion, sliced", "Onions, cooked, boiled"),
          ing("1 tbsp olive oil", "Oil, olive, salad or cooking"),
          ing("150 g greek yogurt", "Yogurt, Greek, plain, nonfat"),
        ],
        known,
      ),
    ).toEqual([]);
  });

  it("flags foods they have not logged", () => {
    const fresh = unfamiliar(
      [
        ing("1 tbsp canola oil", "Oil, canola"),
        ing("500 ml chicken stock", "Soup, stock, chicken, home-prepared"),
        ing("2 tsp sumac", null),
      ],
      known,
    );
    expect(fresh.map((i) => i.displayText)).toEqual([
      "1 tbsp canola oil",
      "500 ml chicken stock",
      "2 tsp sumac",
    ]);
  });

  it("counts the kitchen list and never asks about staples", () => {
    expect(
      unfamiliar(
        [
          ing("2 tbsp tahini", "Seeds, sesame butter, tahini"),
          ing("Salt", "Salt, table"),
          ing("Black pepper", "Spices, pepper, black"),
          ing("1 cup water", "Water, tap, drinking"),
          ing("900 ml very hot tap water", "Beverages, water, tap"),
          ing("1 tsp sea salt"),
        ],
        known,
      ),
    ).toEqual([]);
  });

  it("asks nothing without enough history", () => {
    const fresh = knownSet(["Spinach, raw"], []);
    expect(unfamiliar([ing("1 tbsp sumac")], fresh)).toEqual([]);
    expect(familiarity([ing("1 tbsp sumac")], fresh)).toBe(0.5);
  });

  it("scores the share they already eat", () => {
    expect(
      familiarity(
        [
          ing("2 eggs", "Egg, whole, raw, fresh"),
          ing("100 g spinach", "Spinach, raw"),
          ing("1 tbsp sumac"),
          ing("Salt", "Salt, table"),
        ],
        known,
      ),
    ).toBe(0.75);
  });
});

describe("logged labels", () => {
  it("dedupes to short names for the prompt", () => {
    expect(loggedLabels([...LOGGED, "Egg, white, raw"]).slice(0, 5)).toEqual([
      "egg",
      "chicken",
      "rice",
      "spinach",
      "olive oil",
    ]);
  });
});
