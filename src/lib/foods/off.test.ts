import { describe, expect, it } from "vitest";

import { N } from "@/lib/nutrition/catalog";

import {
  normalizeBarcode,
  offToFood,
  OffResponse,
  validCheckDigit,
} from "./off";

// Trimmed from a real OFF v2 response.
const NUTELLA = OffResponse.parse({
  status: 1,
  product: {
    product_name: "Nutella",
    brands: "Ferrero, Nutella",
    serving_size: "15 g",
    serving_quantity: "15",
    nutriments: {
      "energy-kcal_100g": 539,
      "energy-kj_100g": 2252,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      fat_100g: 30.9,
      "saturated-fat_100g": 10.6,
      sugars_100g: 56.3,
      fiber_100g: "",
      sodium_100g: 0.0428,
      calcium_100g: 0.12,
      "vitamin-d_100g": 0.0000025,
    },
  },
});

describe("barcodes", () => {
  it("normalizes digits and rejects junk", () => {
    expect(normalizeBarcode("3017 6204-22003")).toBe("3017620422003");
    expect(normalizeBarcode("12345")).toBeNull();
    expect(normalizeBarcode("abc12345678")).toBeNull();
  });

  it("checks the GS1 check digit", () => {
    expect(validCheckDigit("3017620422003")).toBe(true); // EAN-13
    expect(validCheckDigit("3017620422004")).toBe(false);
    expect(validCheckDigit("036000291452")).toBe(true); // UPC-A
    expect(validCheckDigit("96385074")).toBe(true); // EAN-8
  });
});

describe("offToFood", () => {
  it("maps nutrients per 100 g in catalog units", () => {
    const food = offToFood(NUTELLA)!;
    expect(food.name).toBe("Nutella");
    expect(food.brand).toBe("Ferrero");
    expect(food.per100g[N.energy]).toBe(539);
    expect(food.per100g[N.protein]).toBe(6.3);
    expect(food.per100g[N.sodium]).toBeCloseTo(42.8);
    expect(food.per100g[1087]).toBeCloseTo(120); // calcium mg
    expect(food.per100g[1114]).toBeCloseTo(2.5); // vitamin D µg
    // Blank values are unknown, not zero.
    expect(food.per100g[N.fiber]).toBeUndefined();
    expect(food.portion).toEqual({ label: "1 serving (15 g)", grams: 15 });
  });

  it("falls back to kJ when kcal is missing", () => {
    const food = offToFood(
      OffResponse.parse({
        status: 1,
        product: {
          product_name: "Oat drink",
          nutriments: { "energy-kj_100g": 209.2, fat_100g: 1.5 },
        },
      }),
    )!;
    expect(food.per100g[N.energy]).toBeCloseTo(50);
    expect(food.portion).toBeNull();
    expect(food.brand).toBeNull();
  });

  it("returns null for unknown or empty products", () => {
    expect(offToFood(OffResponse.parse({ status: 0 }))).toBeNull();
    expect(
      offToFood(
        OffResponse.parse({
          status: 1,
          product: { product_name: "Mystery", nutriments: {} },
        }),
      ),
    ).toBeNull();
    expect(
      offToFood(
        OffResponse.parse({
          status: 1,
          product: { nutriments: { proteins_100g: 3 } },
        }),
      ),
    ).toBeNull();
  });
});
