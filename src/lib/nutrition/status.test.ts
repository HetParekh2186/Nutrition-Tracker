import { describe, expect, it } from "vitest";

import { fractionOf, referenceAmount, sumMacros, targetStatus } from "./status";

describe("targetStatus", () => {
  it("is none without a target", () => {
    expect(targetStatus(10, null)).toBe("none");
    expect(targetStatus(10, { min: null, max: null })).toBe("none");
  });

  it("is low under the minimum and good at or above it", () => {
    expect(targetStatus(60, { min: 90, max: 2000 })).toBe("low");
    expect(targetStatus(90, { min: 90, max: 2000 })).toBe("good");
    expect(targetStatus(400, { min: 90, max: 2000 })).toBe("good");
  });

  it("is over above the upper limit", () => {
    expect(targetStatus(2400, { min: 1500, max: 2300 })).toBe("over");
    expect(targetStatus(30, { min: null, max: 24 })).toBe("over");
    expect(targetStatus(20, { min: null, max: 24 })).toBe("good");
  });
});

describe("referenceAmount and fractionOf", () => {
  it("prefers the minimum, then the limit", () => {
    expect(referenceAmount({ min: 90, max: 2000 })).toBe(90);
    expect(referenceAmount({ min: null, max: 24 })).toBe(24);
    expect(referenceAmount(null)).toBeNull();
  });

  it("is a fraction that can exceed 1", () => {
    expect(fractionOf(45, 90)).toBe(0.5);
    expect(fractionOf(126, 90)).toBeCloseTo(1.4);
    expect(fractionOf(-5, 90)).toBe(0);
    expect(fractionOf(5, null)).toBe(0);
  });
});

describe("sumMacros", () => {
  it("adds entry macros", () => {
    const m = { kcal: 100, proteinG: 10, carbsG: 5, fatG: 2, fiberG: 1 };
    expect(sumMacros([{ macros: m }, { macros: m }]).kcal).toBe(200);
    expect(sumMacros([]).proteinG).toBe(0);
  });
});
