import { describe, expect, it } from "vitest";

import { ANIMAL_FOODS } from "@/lib/db/enums";

import {
  animalFoodsIn,
  containsFromTags,
  describeDiet,
  DIET_PRESETS,
  dietBreaks,
  dietRules,
  dietTagsFor,
  normalizeEats,
  presetFor,
  suitsDiet,
  withDietTags,
} from "./diet";

describe("animalFoodsIn", () => {
  it("names each animal food in a dish", () => {
    expect(animalFoodsIn(["300 g chicken thighs", "1 onion"])).toEqual([
      "chicken",
    ]);
    expect(animalFoodsIn(["2 salmon fillets", "lemon"])).toEqual(["fish"]);
    expect(animalFoodsIn(["3 eggs", "50 g feta"])).toEqual(["eggs", "dairy"]);
    expect(animalFoodsIn(["200 g paneer", "spinach"])).toEqual(["dairy"]);
    expect(animalFoodsIn(["chickpeas", "1 tbsp olive oil", "cumin"])).toEqual(
      [],
    );
  });

  it("splits red meats and poultry", () => {
    expect(animalFoodsIn(["4 rashers bacon"])).toEqual(["pork"]);
    expect(animalFoodsIn(["500 g mutton"])).toEqual(["lamb"]);
    expect(animalFoodsIn(["1 kg brisket", "sirloin"])).toEqual(["beef"]);
    expect(animalFoodsIn(["ground turkey"])).toEqual(["poultry"]);
    expect(animalFoodsIn(["duck breast", "chicken stock"])).toEqual([
      "chicken",
      "poultry",
    ]);
  });

  it("is not fooled by plant lookalikes", () => {
    expect(
      animalFoodsIn([
        "1 eggplant",
        "200 ml coconut milk",
        "2 tbsp peanut butter",
        "500 g butternut squash",
        "1 can kidney beans",
        "Beans, kidney, red, mature seeds",
        "oyster mushrooms",
        "1 tsp cream of tartar",
        "oat milk",
        "vegan cheese",
        "plant-based sausages",
        "egg-free mayo",
        "honeydew melon",
        "chickpeas",
      ]),
    ).toEqual([]);
  });

  it("gives a qualified product its animal", () => {
    expect(animalFoodsIn(["4 chicken sausages"])).toEqual(["chicken"]);
    expect(animalFoodsIn(["turkey bacon"])).toEqual(["poultry"]);
    expect(animalFoodsIn(["2 tuna steaks"])).toEqual(["fish"]);
    expect(animalFoodsIn(["1 cauliflower steak"])).toEqual([]);
    expect(animalFoodsIn(["pork tenderloin"])).toEqual(["pork"]);
    expect(animalFoodsIn(["500 ml beef broth"])).toEqual(["beef"]);
  });

  it("reads goat's cheese as dairy, not goat", () => {
    expect(animalFoodsIn(["100 g goat cheese"])).toEqual(["dairy"]);
    expect(animalFoodsIn(["goat curry"])).toEqual(["lamb"]);
  });

  it("treats meat of unknown animal as every red meat", () => {
    expect(animalFoodsIn(["1 sachet gelatin"])).toEqual([
      "beef",
      "pork",
      "lamb",
    ]);
    expect(animalFoodsIn(["Gelatins, dry powder, unsweetened"])).toContain(
      "pork",
    );
    expect(animalFoodsIn(["400 g venison"])).toEqual(["beef", "pork", "lamb"]);
  });

  it("lets a named animal explain a vague meat word in the same item", () => {
    expect(
      animalFoodsIn(["500 g lean ground beef Beef, ground, 90% lean meat"]),
    ).toEqual(["beef"]);
    expect(animalFoodsIn(["lean mince Beef, ground, raw"])).toEqual(["beef"]);
    // ...but not one in another ingredient.
    expect(animalFoodsIn(["chicken breast | 1 sachet gelatin"])).toEqual([
      "beef",
      "pork",
      "lamb",
      "chicken",
    ]);
  });

  it("knows sauces that hide animal foods", () => {
    expect(animalFoodsIn(["90 g pesto"])).toEqual(["dairy"]);
    expect(animalFoodsIn(["vegan pesto"])).toEqual([]);
    expect(animalFoodsIn(["caesar dressing"])).toEqual([
      "fish",
      "eggs",
      "dairy",
    ]);
  });

  it("finds hidden fish, shellfish, eggs and honey", () => {
    expect(animalFoodsIn(["1 tbsp fish sauce"])).toEqual(["fish"]);
    expect(animalFoodsIn(["2 tsp Worcestershire sauce"])).toEqual(["fish"]);
    expect(animalFoodsIn(["oyster sauce"])).toEqual(["shellfish"]);
    expect(animalFoodsIn(["3 tbsp mayonnaise"])).toEqual(["eggs"]);
    expect(animalFoodsIn(["vanilla custard"])).toEqual(["eggs", "dairy"]);
    expect(animalFoodsIn(["oats", "1 tbsp honey"])).toEqual(["honey"]);
    expect(animalFoodsIn(["mixed seafood"])).toEqual(["fish", "shellfish"]);
  });

  it("reads USDA names, which put the animal first", () => {
    expect(animalFoodsIn(["Beef, top sirloin, steak, raw"])).toEqual(["beef"]);
    expect(animalFoodsIn(["Crustaceans, shrimp, raw"])).toEqual(["shellfish"]);
    expect(animalFoodsIn(["Egg, whole, raw, fresh"])).toEqual(["eggs"]);
    expect(animalFoodsIn(["Butter, salted"])).toEqual(["dairy"]);
    expect(animalFoodsIn(["Nuts, coconut milk, raw"])).toEqual([]);
  });

  it("catches Indian dairy words", () => {
    expect(animalFoodsIn(["1 cup dahi", "malai", "2 tbsp ghee"])).toEqual([
      "dairy",
    ]);
  });
});

describe("presets", () => {
  it("round-trips each preset", () => {
    for (const [name, eats] of Object.entries(DIET_PRESETS)) {
      expect(presetFor(eats)).toBe(name);
    }
  });

  it("calls any other set custom", () => {
    expect(presetFor(["chicken", "eggs", "dairy", "honey"])).toBeNull();
  });

  it("ignores order and duplicates", () => {
    expect(presetFor(["honey", "dairy", "dairy"])).toBe("vegetarian");
    expect(normalizeEats(["eggs", "bogus", "beef"])).toEqual(["beef", "eggs"]);
  });
});

describe("describeDiet", () => {
  it("names presets", () => {
    expect(describeDiet(ANIMAL_FOODS)).toBe("Everything");
    expect(describeDiet([])).toBe("Vegan");
    expect(describeDiet(["dairy", "honey"])).toBe("Vegetarian");
  });

  it("names a vegetarian who eats chicken and eggs", () => {
    expect(describeDiet(["chicken", "eggs", "dairy", "honey"])).toBe(
      "Eggetarian, plus chicken",
    );
  });

  it("names near-omnivores by what they skip", () => {
    expect(describeDiet(ANIMAL_FOODS.filter((g) => g !== "beef"))).toBe(
      "Everything except beef",
    );
    expect(
      describeDiet(ANIMAL_FOODS.filter((g) => g !== "beef" && g !== "pork")),
    ).toBe("Everything except beef and pork");
  });

  it("can add and remove at once", () => {
    expect(describeDiet(["fish", "shellfish", "dairy", "honey"])).toBe(
      "Pescatarian, but no eggs",
    );
    expect(describeDiet(["honey"])).toBe("Vegan, plus honey");
  });
});

describe("dietRules", () => {
  it("spells out every forbidden group", () => {
    const rules = dietRules(["chicken", "eggs", "dairy", "honey"]);
    expect(rules).toContain("chicken, eggs, dairy, honey");
    expect(rules).toContain("pork, including bacon");
    expect(rules).toContain("fish sauce");
    expect(rules).toContain("gelatin");
    expect(rules).not.toContain("mayonnaise");
  });

  it("is short for omnivores", () => {
    expect(dietRules(ANIMAL_FOODS)).toBe("Diet: eats everything.");
  });
});

describe("dietBreaks", () => {
  const chickenEggVeg = ["chicken", "eggs", "dairy", "honey"] as const;

  it("allows what the set allows", () => {
    expect(
      dietBreaks(["chicken tikka", "yogurt", "2 eggs"], chickenEggVeg),
    ).toEqual([]);
  });

  it("lists what it does not", () => {
    expect(
      dietBreaks(["chicken", "bacon", "fish sauce"], chickenEggVeg),
    ).toEqual(["pork", "fish"]);
  });
});

describe("tags", () => {
  it("records contents and the presets a dish suits", () => {
    expect(dietTagsFor(["3 eggs", "50 g feta"])).toEqual([
      "pescatarian",
      "eggetarian",
      "contains:eggs",
      "contains:dairy",
    ]);
    expect(dietTagsFor(["chickpeas"])).toEqual([
      "pescatarian",
      "eggetarian",
      "vegetarian",
      "vegan",
    ]);
    expect(dietTagsFor(["chicken"])).toEqual(["contains:chicken"]);
  });

  it("replaces stale diet tags and keeps the rest", () => {
    expect(withDietTags(["vegan", "quick"], ["chicken"])).toEqual([
      "quick",
      "contains:chicken",
    ]);
  });

  it("reads old preset-only tags strictly", () => {
    expect(containsFromTags(["vegetarian", "quick"])).toEqual([
      "dairy",
      "honey",
    ]);
    expect(containsFromTags(["quick"])).toEqual([...ANIMAL_FOODS]);
    expect(containsFromTags(["vegan"])).toEqual([]);
  });
});

describe("suitsDiet", () => {
  const chicken = dietTagsFor(["chicken curry", "ghee"]);

  it("lets omnivores eat anything", () => {
    expect(suitsDiet(chicken, ANIMAL_FOODS)).toBe(true);
    expect(suitsDiet([], ANIMAL_FOODS)).toBe(true);
  });

  it("lets a chicken-eating vegetarian have chicken curry", () => {
    expect(suitsDiet(chicken, ["chicken", "eggs", "dairy", "honey"])).toBe(
      true,
    );
    expect(suitsDiet(chicken, DIET_PRESETS.vegetarian)).toBe(false);
  });

  it("keeps untagged recipes away from restricted diets", () => {
    expect(suitsDiet([], ["chicken", "eggs", "dairy"])).toBe(false);
  });
});
