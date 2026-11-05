import { describe, expect, it } from "vitest";

import { N } from "@/lib/nutrition/catalog";

import { defaultAmount } from "./preview";
import type { FoodHit } from "./types";

const base: FoodHit = {
  id: 1,
  name: "Egg, whole, raw, fresh",
  brand: null,
  source: "usda_sr_legacy",
  per100g: {
    [N.energy]: 143,
    [N.protein]: 12.56,
    [N.carbs]: 0.72,
    [N.fat]: 9.51,
  },
  defaultPortion: { label: "1 large", grams: 50 },
  lastUsed: null,
  uses: 0,
  score: null,
};

describe("defaultAmount", () => {
  it("uses the first portion for a new food", () => {
    const p = defaultAmount(base);
    expect(p.label).toBe("1 large");
    expect(p.grams).toBe(50);
    expect(p.macros.kcal).toBeCloseTo(71.5);
    expect(p.macros.proteinG).toBeCloseTo(6.28);
  });

  it("repeats the last logged amount", () => {
    const p = defaultAmount({
      ...base,
      lastUsed: { quantityG: 100, portionLabel: "2 × 1 large" },
    });
    expect(p.label).toBe("2 × 1 large");
    expect(p.macros.kcal).toBeCloseTo(143);
  });

  it("labels a last amount logged in grams", () => {
    expect(
      defaultAmount({
        ...base,
        lastUsed: { quantityG: 180, portionLabel: null },
      }).label,
    ).toBe("180 g");
  });

  it("falls back to 100 g", () => {
    const p = defaultAmount({ ...base, defaultPortion: null });
    expect(p.label).toBe("100 g");
    expect(p.macros.kcal).toBe(143);
  });
});
