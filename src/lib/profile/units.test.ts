import { describe, expect, it } from "vitest";

import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "./units";

describe("body unit conversions", () => {
  it("round-trips pounds", () => {
    expect(kgToLb(75)).toBeCloseTo(165.35, 2);
    expect(lbToKg(kgToLb(75))).toBeCloseTo(75, 10);
  });

  it("converts feet and inches", () => {
    expect(ftInToCm(5, 10)).toBeCloseTo(177.8, 10);
    expect(cmToFtIn(178)).toEqual({ feet: 5, inches: 10 });
    expect(cmToFtIn(182.88)).toEqual({ feet: 6, inches: 0 });
  });
});
