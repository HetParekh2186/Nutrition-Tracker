import { describe, expect, it } from "vitest";

import { editDistance, planQuery, prefixTsQuery, vocabulary } from "./query";

describe("prefixTsQuery", () => {
  it("makes every word a prefix match", () => {
    expect(prefixTsQuery("Chicken brea")).toBe("chicken:* & brea:*");
  });

  it("strips tsquery operators and punctuation", () => {
    expect(prefixTsQuery("egg & (yolk) | !raw:*")).toBe(
      "egg:* & yolk:* & raw:*",
    );
  });

  it("keeps accented letters and numbers", () => {
    expect(prefixTsQuery("jalapeño 2%")).toBe("jalapeño:* & 2:*");
  });

  it("returns null for blank input", () => {
    expect(prefixTsQuery("  -- ")).toBeNull();
  });
});

const VOCAB = vocabulary(
  [
    ["chicken", 300],
    ["chickpeas", 20],
    ["breast", 120],
    ["broccoli", 10],
    ["yogurt", 60],
    ["greek", 30],
    ["lentils", 15],
    ["tomatoes", 40],
    ["cheese", 200],
    ["cheddar", 12],
    ["paneer", 0],
  ].map(([word, count]) => ({ word: word as string, count: count as number })),
);

describe("planQuery", () => {
  it("corrects misspelled words against food-name words", () => {
    expect(planQuery("chiken brest", VOCAB)).toEqual({
      tsquery: "chicken:* & breast:*",
      text: "chicken breast",
      corrected: "chicken breast",
      lead: ["chicken"],
    });
    expect(planQuery("brocolli", VOCAB)?.corrected).toBe("broccoli");
  });

  it("leaves words alone that start a real word", () => {
    expect(planQuery("chick", VOCAB)?.corrected).toBeNull();
    expect(planQuery("tomatoe", VOCAB)?.tsquery).toBe("tomatoe:*");
  });

  it("does not guess at short words", () => {
    expect(planQuery("chese", VOCAB)?.corrected).toBe("cheese");
    expect(planQuery("chee", VOCAB)?.corrected).toBeNull();
    expect(planQuery("xyzzy", VOCAB)?.corrected).toBeNull();
  });

  it("adds everyday and regional synonyms", () => {
    expect(planQuery("greek yoghurt", VOCAB)?.tsquery).toBe(
      "greek:* & (yoghurt:* | yogurt:*)",
    );
    expect(planQuery("dal", VOCAB)?.tsquery).toBe("(dal:* | lentil:*)");
    expect(planQuery("dal", VOCAB)?.lead).toEqual(["dal", "lentil"]);
    expect(planQuery("pb", VOCAB)?.tsquery).toBe(
      "(pb:* | (peanut:* & butter:*))",
    );
  });
});

describe("editDistance", () => {
  it("counts a swap of neighbours as one edit", () => {
    expect(editDistance("chikcen", "chicken", 2)).toBe(1);
    expect(editDistance("chiken", "chicken", 2)).toBe(1);
    expect(editDistance("abc", "xyzabc", 2)).toBe(3);
  });
});
