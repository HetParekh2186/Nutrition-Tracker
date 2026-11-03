import { describe, expect, it } from "vitest";

import {
  expandExclusion,
  expandExclusions,
  wordStartPattern,
} from "./allergens";

const matches = (rule: string, text: string) =>
  expandExclusion(rule).some((w) =>
    new RegExp(wordStartPattern(w, "js"), "i").test(text),
  );

describe("expandExclusion", () => {
  it("catches shrimp for a shellfish rule, in display text and USDA names", () => {
    expect(matches("shellfish", "300 g shrimp, peeled")).toBe(true);
    expect(matches("shellfish", "Crustaceans, shrimp, raw")).toBe(true);
    expect(matches("seafood", "1 lobster tail")).toBe(true);
  });

  it("catches cashews for tree nuts and plurals for single words", () => {
    expect(matches("tree nuts", "50 g cashews")).toBe(true);
    expect(matches("mushrooms", "200 g mushroom, sliced")).toBe(true);
  });

  it("keeps unknown rules as themselves", () => {
    expect(expandExclusion("cilantro")).toEqual(["cilantro"]);
  });

  it("does not match inside other words", () => {
    expect(matches("ham", "1 tsp garam masala")).toBe(false);
    expect(matches("egg", "1 eggplant")).toBe(false);
    expect(matches("egg", "2 eggs")).toBe(true);
    expect(matches("dairy", "500 g butternut squash")).toBe(false);
  });

  it("dedupes across rules", () => {
    const words = expandExclusions(["dairy", "milk"]);
    expect(words.filter((w) => w === "milk")).toHaveLength(1);
  });
});

describe("wordStartPattern", () => {
  it("escapes regex characters", () => {
    expect(wordStartPattern("c++", "pg")).toBe("\\mc\\+\\+");
  });
});
