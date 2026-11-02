import { describe, expect, it } from "vitest";

import {
  defaultSlotForHour,
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
