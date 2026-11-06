import { describe, expect, it } from "vitest";

import { mmr, similarity, type Rankable } from "./diversify";
import { explain, type ExplainContext } from "./explain";

const item = (id: string, score: number, cuisine: string): Rankable => ({
  id,
  score,
  cuisine,
  embedding: null,
});

describe("mmr", () => {
  it("keeps the best item first", () => {
    const out = mmr([item("a", 0.9, "indian"), item("b", 0.5, "thai")], 2);
    expect(out[0]!.id).toBe("a");
  });

  it("spreads cuisines across the top results", () => {
    const items = [
      item("i1", 0.9, "indian"),
      item("i2", 0.89, "indian"),
      item("i3", 0.88, "indian"),
      item("t1", 0.8, "thai"),
      item("m1", 0.78, "mexican"),
    ];
    const top3 = mmr(items, 3).map((i) => i.id);
    expect(top3).toEqual(["i1", "t1", "m1"]);
  });

  it("still returns same-cuisine dishes when nothing else is left", () => {
    expect(mmr([item("a", 0.9, "x"), item("b", 0.8, "x")], 5)).toHaveLength(2);
  });

  it("uses embeddings when present", () => {
    const a = { ...item("a", 1, "x"), embedding: [1, 0] };
    const b = { ...item("b", 1, "y"), embedding: [1, 0] };
    const c = { ...item("c", 1, "z"), embedding: [0, 1] };
    expect(similarity(a, b)).toBeCloseTo(1);
    expect(similarity(a, c)).toBe(0);
  });
});

// SPEC.md full score example: chips are M and T.
const CTX: ExplainContext = {
  slot: "dinner",
  budget: { kcal: 745, proteinG: 50, carbsG: 80, fatG: 25 },
  serving: { kcal: 730, proteinG: 45, carbsG: 70, fatG: 30 },
  cuisine: "mexican",
  likedCuisine: false,
  daysSinceCooked: 30,
  rating: null,
  similarCooked: null,
};

describe("explain", () => {
  it("gives the spec's chips for the worked example", () => {
    const reasons = explain(
      { M: 0.889, T: 0.8, F: 0.5, C: 0, N: 1, R: 0.6, D: 0 },
      CTX,
      2,
    );
    expect(reasons).toEqual([
      "Fits your remaining dinner macros",
      "Similar to meals you cook often",
    ]);
  });

  it("names protein when it fits best", () => {
    const reasons = explain(
      { M: 0.9, T: 0.5, F: 0.5, C: 0, N: 1, R: 0.6, D: 0 },
      { ...CTX, serving: { kcal: 600, proteinG: 49, carbsG: 60, fatG: 20 } },
    );
    expect(reasons[0]).toBe("Fits your remaining 50 g protein");
  });

  it("mentions a dish you cooked twice", () => {
    const reasons = explain(
      { M: 0.3, T: 0.9, F: 0.5, C: 0, N: 0, R: 0.6, D: 0 },
      { ...CTX, similarCooked: { title: "Butter chicken", count: 2 } },
    );
    expect(reasons[0]).toBe("Like the butter chicken you cooked twice");
  });

  it("calls out liked cuisines and high ratings", () => {
    const reasons = explain(
      { M: 0.2, T: 0.4, F: 0.5, C: 1, N: 0, R: 1, D: 0 },
      { ...CTX, cuisine: "indian", likedCuisine: true, rating: 5 },
    );
    expect(reasons).toContain("You love Indian food");
    expect(reasons).toContain("You rated it 5 stars");
  });

  it("says when a recipe uses foods you already eat", () => {
    const terms = { M: 0.2, T: 0.4, F: 1, C: 0, N: 0, R: 0.6, D: 0 };
    expect(explain(terms, CTX)[0]).toBe("Made from foods you already eat");
    expect(
      explain({ ...terms, F: 0.85 }, { ...CTX, newIngredients: ["sumac"] })[0],
    ).toBe("Mostly foods you already eat");
  });

  it("always returns at least one reason", () => {
    expect(
      explain(
        { M: 0, T: 0, F: 0.5, C: 0, N: 0, R: 0, D: 0 },
        { ...CTX, daysSinceCooked: 3 },
      ),
    ).toEqual(["Good for dinner"]);
  });
});
