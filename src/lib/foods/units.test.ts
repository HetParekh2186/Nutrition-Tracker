import { describe, expect, it } from "vitest";

import {
  amountFromEntry,
  defaultSlotForHour,
  equivalents,
  gramsFor,
  GRAMS_PER_OZ,
  portionLabelFor,
  portionOptions,
} from "./units";

const egg = [{ id: 7, label: "1 large", grams: 50 }];

describe("portionOptions", () => {
  it("lists the food's portions, then g and oz", () => {
    expect(portionOptions(egg).map((o) => o.key)).toEqual([
      "portion:1 large:50",
      "g",
      "oz",
    ]);
  });
});

describe("gramsFor", () => {
  it("2 large eggs is 100 g", () => {
    expect(gramsFor(2, portionOptions(egg)[0]!)).toBe(100);
  });

  it("converts ounces", () => {
    expect(gramsFor(4, portionOptions([])[1]!)).toBeCloseTo(4 * GRAMS_PER_OZ);
  });
});

describe("portionLabelFor", () => {
  const [large, g, oz] = portionOptions(egg);

  it("keeps a single portion's label", () => {
    expect(portionLabelFor(1, large!)).toBe("1 large");
  });

  it("prefixes multiples", () => {
    expect(portionLabelFor(2, large!)).toBe("2 × 1 large");
  });

  it("stores nothing for grams and a short label for ounces", () => {
    expect(portionLabelFor(180, g!)).toBeNull();
    expect(portionLabelFor(6, oz!)).toBe("6 oz");
  });
});

describe("defaultSlotForHour", () => {
  it.each([
    [7, "breakfast"],
    [12, "lunch"],
    [16, "snack"],
    [19, "dinner"],
    [23, "snack"],
    [2, "snack"],
  ] as const)("hour %i is %s", (hour, slot) => {
    expect(defaultSlotForHour(hour)).toBe(slot);
  });
});

describe("amountFromEntry", () => {
  const pizza = portionOptions([{ label: "1 serving", grams: 250 }]);

  it("reads a multiplied portion back", () => {
    const { quantity, option } = amountFromEntry(500, "2 × 1 serving", pizza);
    expect(option.label).toBe("1 serving");
    expect(quantity).toBe(2);
  });

  it("reads a single portion and ounces", () => {
    expect(amountFromEntry(250, "1 serving", pizza).quantity).toBe(1);
    const oz = amountFromEntry(GRAMS_PER_OZ * 3, "3 oz", pizza);
    expect(oz.option.key).toBe("oz");
    expect(oz.quantity).toBeCloseTo(3, 9);
  });

  it("takes the quantity from grams, so an edited weight stays exact", () => {
    expect(amountFromEntry(375, "2 × 1 serving", pizza).quantity).toBe(1.5);
  });

  it("falls back to grams for unknown or missing labels", () => {
    expect(amountFromEntry(120, null, pizza).option.key).toBe("g");
    expect(amountFromEntry(120, "1 slice", pizza)).toMatchObject({
      quantity: 120,
      option: { key: "g" },
    });
  });
});

describe("equivalents", () => {
  const pizza = portionOptions([{ label: "1 serving", grams: 250 }]);

  it("states the weight in the other units, grams first", () => {
    expect(equivalents(500, pizza, pizza[0]!.key)).toEqual([
      "500 g",
      "17.64 oz",
    ]);
    expect(equivalents(125, pizza, "g")).toEqual([
      "0.5 × 1 serving",
      "4.41 oz",
    ]);
  });
});
