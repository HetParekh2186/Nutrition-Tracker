import { describe, expect, it } from "vitest";

import type { Resolution } from "@/lib/foods/resolve";
import type { FoodHit } from "@/lib/foods/types";
import fixture from "@/lib/llm/fixtures/parse-breakfast.json";
import { ParseResult } from "@/lib/llm/schemas";

import { estimateGrams, normalizeUnit } from "./grams";
import { parseLog } from "./parse";

// Real USDA portion labels, from food_portions.
const EGG = [
  { label: "1 cup (4.86 large eggs)", grams: 243 },
  { label: "1 large", grams: 50 },
  { label: "1 medium", grams: 44 },
];
const BANANA = [
  { label: "1 cup, mashed", grams: 225 },
  { label: "1 NLEA serving", grams: 126 },
  { label: '1 medium (7" to 7-7/8" long)', grams: 118 },
];
const MILK = [
  { label: "1 fl oz", grams: 30.5 },
  { label: "1 cup", grams: 244 },
];
const BUTTER = [
  { label: "1 tbsp", grams: 14.2 },
  { label: '1 pat (1" sq, 1/3" high)', grams: 5 },
];

describe("normalizeUnit", () => {
  it("maps plurals and long names to short units", () => {
    expect(normalizeUnit("Tablespoons")).toBe("tbsp");
    expect(normalizeUnit("cups")).toBe("cup");
    expect(normalizeUnit("slices.")).toBe("slice");
    expect(normalizeUnit("ounces")).toBe("oz");
    expect(normalizeUnit("g")).toBe("g");
  });
});

describe("estimateGrams", () => {
  it("converts mass units exactly", () => {
    expect(estimateGrams(150, "g", [])).toEqual({
      grams: 150,
      portionLabel: null,
      method: "mass",
    });
    expect(estimateGrams(2, "oz", []).grams).toBe(56.7);
  });

  it("prefers the food's own portion, by its first word", () => {
    const est = estimateGrams(2, "large", EGG);
    expect(est).toEqual({
      grams: 100,
      portionLabel: "2 × 1 large",
      method: "portion",
    });
  });

  it("matches long unit names to short portion labels", () => {
    expect(estimateGrams(1, "tablespoon", BUTTER).grams).toBe(14.2);
    expect(estimateGrams(1, "cup", MILK).grams).toBe(244);
  });

  it("uses the food's density for a volume it has no portion for", () => {
    // 1 tsp of butter from the tbsp portion: 14.2 / 3.
    const est = estimateGrams(1, "tsp", BUTTER);
    expect(est.method).toBe("volume");
    expect(est.grams).toBeCloseTo(4.7, 1);
  });

  it("falls back to water density and flags it", () => {
    const est = estimateGrams(1, "cup", []);
    expect(est).toMatchObject({ grams: 236.6, method: "guess" });
  });

  it("picks a medium portion when the unit is unknown", () => {
    const est = estimateGrams(1, "banana", BANANA);
    expect(est).toMatchObject({
      grams: 118,
      portionLabel: "1 medium",
      method: "guess",
    });
  });

  it("guesses 100 g a unit when the food has no portions", () => {
    expect(estimateGrams(2, "piece", [])).toEqual({
      grams: 200,
      portionLabel: null,
      method: "guess",
    });
  });
});

function hit(id: number, name: string): FoodHit {
  return {
    id,
    name,
    brand: null,
    source: "usda_sr_legacy",
    per100g: {},
    defaultPortion: null,
    lastUsed: null,
    uses: 0,
    score: null,
  };
}

describe("parseLog with a recorded Claude response", () => {
  it("matches the fixture against the schema", () => {
    expect(ParseResult.safeParse(fixture).success).toBe(true);
  });

  it("resolves every item, converts to grams and flags weak matches", async () => {
    const foods: Record<string, Resolution> = {
      "egg, whole, raw": {
        query: "egg, whole, raw",
        best: hit(1, "Egg, whole, raw, fresh"),
        confidence: 0.95,
        alternatives: [hit(2, "Egg, whole, cooked, fried")],
      },
      "bread, sourdough, toasted": {
        query: "bread, sourdough, toasted",
        best: hit(3, "Bread, french or vienna, toasted (includes sourdough)"),
        confidence: 0.55,
        alternatives: [],
      },
      "butter, salted": {
        query: "butter, salted",
        best: hit(4, "Butter, salted"),
        confidence: 1,
        alternatives: [],
      },
      "banana, raw": {
        query: "banana, raw",
        best: hit(5, "Bananas, raw"),
        confidence: 0.9,
        alternatives: [],
      },
      "coffee, brewed": {
        query: "coffee, brewed",
        best: null,
        confidence: 0,
        alternatives: [],
      },
    };
    const portions = new Map([
      [1, EGG],
      [3, [{ label: "1 slice, medium", grams: 59 }]],
      [4, BUTTER],
      [5, BANANA],
    ]);
    const asked: number[][] = [];

    const items = await parseLog(
      {
        parse: async () => ParseResult.parse(fixture),
        resolve: async (q) => foods[q]!,
        portions: async (ids) => {
          asked.push(ids);
          return portions;
        },
      },
      "2 eggs, a slice of sourdough toast with butter, a banana and black coffee",
    );

    // One portions query for every candidate.
    expect(asked).toEqual([[1, 2, 3, 4, 5]]);
    expect(items).toHaveLength(5);

    const [eggs, toast, butter, banana, coffee] = items;
    expect(eggs).toMatchObject({ needsReview: false, confidence: 0.95 });
    expect(eggs!.candidates.map((c) => c.grams)).toEqual([100, 200]);
    expect(toast).toMatchObject({ needsReview: true });
    expect(toast!.candidates[0]).toMatchObject({
      grams: 59,
      method: "portion",
    });
    expect(butter!.candidates[0]!.grams).toBeCloseTo(4.7, 1);
    expect(banana!.candidates[0]).toMatchObject({ grams: 118 });
    expect(coffee).toMatchObject({ needsReview: true, candidates: [] });
  });
});
