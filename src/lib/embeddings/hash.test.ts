import { describe, expect, it } from "vitest";

import { cosine, DIMENSIONS, hashEmbedding, normalize, tokens } from "./hash";

describe("tokens", () => {
  it("lowercases, drops stop words and plurals, adds word pairs", () => {
    expect(tokens("Chicken thighs with Rice")).toEqual([
      "chicken",
      "thigh",
      "rice",
      "chicken_thigh",
      "thigh_rice",
    ]);
  });
});

describe("hashEmbedding", () => {
  it("is unit length and the right size", () => {
    const v = hashEmbedding("chicken tikka masala with basmati rice");
    expect(v).toHaveLength(DIMENSIONS);
    expect(Math.hypot(...v)).toBeCloseTo(1, 10);
  });

  it("is deterministic", () => {
    expect(hashEmbedding("dal tadka")).toEqual(hashEmbedding("dal tadka"));
  });

  it("puts similar meals closer than different ones", () => {
    const curry = hashEmbedding(
      "indian chicken curry rice yogurt onion tomato",
    );
    const tikka = hashEmbedding(
      "indian chicken tikka masala rice cream tomato",
    );
    const oats = hashEmbedding(
      "american overnight oats milk banana peanut butter",
    );
    expect(cosine(curry, tikka)).toBeGreaterThan(cosine(curry, oats));
  });

  it("returns a zero vector for empty text", () => {
    expect(hashEmbedding("the and of").every((x) => x === 0)).toBe(true);
  });
});

describe("cosine and normalize", () => {
  it("handles zero vectors", () => {
    expect(cosine([0, 0], [1, 0])).toBe(0);
    expect(normalize([0, 0])).toEqual([0, 0]);
  });

  it("is 1 for identical directions", () => {
    expect(cosine([1, 2], [2, 4])).toBeCloseTo(1, 10);
  });
});
