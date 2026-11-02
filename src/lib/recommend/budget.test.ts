import { describe, expect, it } from "vitest";

import { slotBudget } from "./budget";

const remaining = {
  kcal: 1000,
  proteinG: 80,
  carbsG: 120,
  fatG: 40,
  fiberG: 10,
};

describe("slotBudget", () => {
  it("gives dinner everything left", () => {
    expect(slotBudget(remaining, "dinner")).toEqual({
      kcal: 1000,
      proteinG: 80,
      carbsG: 120,
      fatG: 40,
    });
  });

  it("applies the default shares", () => {
    expect(slotBudget(remaining, "breakfast").kcal).toBeCloseTo(300);
    expect(slotBudget(remaining, "lunch").proteinG).toBeCloseTo(36);
    expect(slotBudget(remaining, "snack").fatG).toBeCloseTo(10);
  });

  it("passes negative remaining through for the fit check to handle", () => {
    expect(slotBudget({ ...remaining, fatG: -5 }, "dinner").fatG).toBe(-5);
  });
});
