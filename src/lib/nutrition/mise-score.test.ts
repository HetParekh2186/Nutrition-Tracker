import { describe, expect, it } from "vitest";

import { N } from "./catalog";
import {
  flaggedAdditives,
  miseScore,
  nutriscorePoints,
  nutritionScore,
  ratingFor,
} from "./mise-score";

const SAT = 1258;

// Nutella per 100 g, from its Open Food Facts label.
const NUTELLA = {
  [N.energy]: 539,
  [N.sugars]: 56.3,
  [SAT]: 10.6,
  [N.sodium]: 42.8,
  [N.fiber]: 0,
  [N.protein]: 6.3,
};

// Raw chicken breast, USDA: no carbs, so no sugars value is stored.
const CHICKEN = {
  [N.energy]: 120,
  [N.protein]: 22.5,
  [N.fat]: 2.6,
  [SAT]: 0.56,
  [N.carbs]: 0,
  [N.sodium]: 45,
};

describe("Nutri-Score points", () => {
  it("matches the published grade for Nutella (26, E)", () => {
    expect(nutriscorePoints(NUTELLA)).toBe(26);
  });

  it("lets protein offset a lean food, reading absent sugars as zero", () => {
    // 1 point for energy, minus 5 for protein.
    expect(nutriscorePoints(CHICKEN)).toBe(-4);
  });

  it("drops protein once negative points reach 11", () => {
    const fatty = { ...NUTELLA, [N.protein]: 20 };
    expect(nutriscorePoints(fatty)).toBe(26);
  });

  it("refuses to guess when sodium, or sugars in a carby food, is missing", () => {
    const { [N.sodium]: _sodium, ...noSodium } = NUTELLA;
    expect(nutriscorePoints(noSodium)).toBeNull();
    expect(
      nutriscorePoints({
        [N.energy]: 350,
        [N.carbs]: 70,
        [SAT]: 0.5,
        [N.sodium]: 5,
      }),
    ).toBeNull();
  });
});

describe("nutrition score", () => {
  it("is continuous across grade boundaries and clamps at the ends", () => {
    expect(nutritionScore(-20)).toBe(100);
    expect(nutritionScore(-1)).toBe(80);
    expect(nutritionScore(2)).toBe(60);
    expect(nutritionScore(10)).toBe(40);
    expect(nutritionScore(18)).toBe(20);
    expect(nutritionScore(40)).toBe(0);
    expect(nutritionScore(6)).toBe(50);
  });

  it("rates on 75 / 50 / 25", () => {
    expect(ratingFor(75)).toBe("excellent");
    expect(ratingFor(74)).toBe("good");
    expect(ratingFor(50)).toBe("good");
    expect(ratingFor(49)).toBe("poor");
    expect(ratingFor(24)).toBe("bad");
  });
});

describe("Mise score", () => {
  it("scores whole foods on nutrition alone", () => {
    const s = miseScore(CHICKEN)!;
    expect(s).toMatchObject({
      score: 84,
      rating: "excellent",
      basis: "nutrition",
    });
    expect(s.parts.additives).toBeNull();
  });

  it("weights nutrition, additives and organic 60 / 30 / 10", () => {
    const clean = miseScore(CHICKEN, {
      nutriscorePoints: null,
      additives: [],
      organic: true,
    })!;
    expect(clean.parts).toEqual({ nutrition: 84, additives: 30, organic: 10 });
    expect(clean.score).toBe(Math.round(84 * 0.6 + 40));
    expect(clean.basis).toBe("full");
  });

  it("prefers Open Food Facts' own Nutri-Score points", () => {
    const s = miseScore(NUTELLA, {
      nutriscorePoints: 2,
      additives: [],
      organic: false,
    })!;
    expect(s.parts.nutrition).toBe(60);
  });

  it("takes 10 per additive of concern and caps high risk at 49", () => {
    const moderate = miseScore(CHICKEN, {
      nutriscorePoints: null,
      additives: ["en:e407", "en:e330"],
      organic: true,
    })!;
    expect(moderate.parts.additives).toBe(20);
    expect(moderate.flagged.map((a) => a.code)).toEqual(["E407"]);

    const cured = miseScore(CHICKEN, {
      nutriscorePoints: null,
      additives: ["en:e407", "en:e250"],
      organic: true,
    })!;
    expect(cured.parts.additives).toBe(0);
    expect(cured.score).toBe(49);
    expect(cured.rating).toBe("poor");
    expect(cured.flagged[0]).toMatchObject({ code: "E250", risk: "high" });
  });

  it("is null without enough nutrition data", () => {
    expect(miseScore({ [N.energy]: 100 })).toBeNull();
  });
});

describe("flagged additives", () => {
  it("reads OFF tags, ignores harmless ones and lists high risk first", () => {
    expect(
      flaggedAdditives(["en:e330", "en:e951", "en:e171", "en:e951"]).map(
        (a) => a.code,
      ),
    ).toEqual(["E171", "E951"]);
  });
});
