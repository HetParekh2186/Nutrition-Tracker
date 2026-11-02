import { describe, expect, it } from "vitest";

import { dietTagsFor, suitsDiet, withDietTags } from "./diet";

describe("dietTagsFor", () => {
  it("tags a meat dish with nothing", () => {
    expect(dietTagsFor(["300 g chicken thighs", "1 onion"])).toEqual([]);
  });

  it("tags fish as pescatarian only", () => {
    expect(dietTagsFor(["2 salmon fillets", "lemon"])).toEqual(["pescatarian"]);
  });

  it("allows eggs for eggetarian but not vegetarian", () => {
    expect(dietTagsFor(["3 eggs", "50 g feta"])).toEqual([
      "pescatarian",
      "eggetarian",
    ]);
  });

  it("tags dairy without eggs as vegetarian", () => {
    expect(dietTagsFor(["200 g paneer", "spinach"])).toEqual([
      "pescatarian",
      "eggetarian",
      "vegetarian",
    ]);
  });

  it("tags plant-only dishes as vegan", () => {
    expect(dietTagsFor(["chickpeas", "1 tbsp olive oil", "cumin"])).toContain(
      "vegan",
    );
  });

  it("is not fooled by plant lookalikes", () => {
    const tags = dietTagsFor([
      "1 eggplant",
      "200 ml coconut milk",
      "2 tbsp peanut butter",
      "500 g butternut squash",
    ]);
    expect(tags).toContain("vegan");
  });

  it("treats honey as not vegan", () => {
    expect(dietTagsFor(["oats", "1 tbsp honey"])).not.toContain("vegan");
  });

  it("catches meat stock", () => {
    expect(dietTagsFor(["lentils", "500 ml chicken broth"])).toEqual([]);
  });
});

describe("withDietTags", () => {
  it("replaces stale diet tags and keeps the rest", () => {
    expect(withDietTags(["vegan", "quick"], ["chicken"])).toEqual(["quick"]);
  });
});

describe("suitsDiet", () => {
  it("lets omnivores and unset diets eat anything", () => {
    expect(suitsDiet([], "omnivore")).toBe(true);
    expect(suitsDiet([], null)).toBe(true);
  });

  it("requires the matching tag otherwise", () => {
    expect(suitsDiet(["pescatarian"], "vegetarian")).toBe(false);
    expect(
      suitsDiet(["pescatarian", "eggetarian", "vegetarian"], "vegetarian"),
    ).toBe(true);
  });
});

describe("meat cuts without the animal's name", () => {
  it("tags sirloin and brisket as meat", () => {
    expect(dietTagsFor(["450 g thinly sliced sirloin"])).toEqual([]);
    expect(dietTagsFor(["1 kg brisket"])).toEqual([]);
  });
});
