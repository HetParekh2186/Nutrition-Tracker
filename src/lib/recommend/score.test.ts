import { describe, expect, it } from "vitest";

import {
  cuisinePreference,
  dislikePenalty,
  macroErrors,
  macroFit,
  novelty,
  ratingPrior,
  score,
  tasteSimilarity,
} from "./score";

// SPEC.md "Macro fit" worked example.
const BUDGET = { kcal: 745, proteinG: 50, carbsG: 80, fatG: 25 };
const SERVING = { kcal: 730, proteinG: 45, carbsG: 70, fatG: 30 };

describe("macro fit (M)", () => {
  it("matches the worked example per macro", () => {
    const e = macroErrors(SERVING, BUDGET);
    expect(e.kcal).toBeCloseTo(0.02, 3);
    expect(e.proteinG).toBeCloseTo(0.1, 10);
    expect(e.carbsG).toBeCloseTo(0.125, 10);
    expect(e.fatG).toBeCloseTo(0.2, 10);
  });

  it("M = 0.889", () => {
    expect(macroFit(SERVING, BUDGET)).toBeCloseTo(0.889, 3);
  });

  it("caps each error at 1", () => {
    expect(macroErrors({ ...SERVING, fatG: 100 }, BUDGET).fatG).toBe(1);
  });

  it("sets the error to 1 for a budget of 0 or less", () => {
    const e = macroErrors(SERVING, { ...BUDGET, fatG: 0, carbsG: -10 });
    expect(e.fatG).toBe(1);
    expect(e.carbsG).toBe(1);
  });

  it("is 1 for a perfect fit", () => {
    expect(macroFit(BUDGET, BUDGET)).toBe(1);
  });
});

describe("full score", () => {
  it("matches the worked example: 0.847", () => {
    const s = score({ M: 0.889, T: 0.8, F: 0.8, C: 1, N: 1, R: 0.6, D: 0 });
    expect(s).toBeCloseTo(0.847, 3);
  });

  it("subtracts the dislike penalty", () => {
    expect(
      score({
        M: 0.889,
        T: 0.8,
        F: 0.8,
        C: 1,
        N: 1,
        R: 0.6,
        D: dislikePenalty(2),
      }),
    ).toBeCloseTo(0.547, 3);
  });

  it("ranks a recipe of familiar foods above one of new foods", () => {
    const base = { M: 0.8, T: 0.5, C: 0, N: 1, R: 0.6, D: 0 };
    expect(score({ ...base, F: 1 })).toBeGreaterThan(
      score({ ...base, F: 0.2 }),
    );
  });
});

describe("terms", () => {
  it("maps cosine to 0..1, with 0.5 when there is no taste yet", () => {
    expect(tasteSimilarity(0.6)).toBeCloseTo(0.8, 10);
    expect(tasteSimilarity(-1)).toBe(0);
    expect(tasteSimilarity(null)).toBe(0.5);
  });

  it("prefers liked cuisines, then learned weights", () => {
    expect(cuisinePreference("Indian", ["indian"], {})).toBe(1);
    expect(cuisinePreference("italian", ["indian"], { italian: 0.3 })).toBe(
      0.3,
    );
    expect(cuisinePreference("thai", [], {})).toBe(0);
    expect(cuisinePreference(null, ["indian"], {})).toBe(0);
  });

  it("novelty is 1 when not cooked in 14 days", () => {
    expect(novelty(null)).toBe(1);
    expect(novelty(20)).toBe(1);
    expect(novelty(7)).toBe(0.5);
    expect(novelty(0)).toBe(0);
  });

  it("rating prior is rating / 5 or 0.6", () => {
    expect(ratingPrior(5)).toBe(1);
    expect(ratingPrior(3)).toBe(0.6);
    expect(ratingPrior(null)).toBe(0.6);
  });
});
