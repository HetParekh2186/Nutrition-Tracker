import { describe, expect, it } from "vitest";

import {
  decimalsFor,
  formatAmount,
  formatRemaining,
  formatWithUnit,
  roundForDisplay,
} from "./format";

describe("display rounding (rule 7)", () => {
  it("kcal has no decimals", () => {
    expect(formatAmount(2739.625, "kcal")).toBe("2,740");
  });

  it("grams have 1 decimal under 10 g and none above", () => {
    expect(formatAmount(7.1, "g")).toBe("7.1");
    expect(formatAmount(9.94, "g")).toBe("9.9");
    expect(formatAmount(55.8, "g")).toBe("56");
    expect(formatAmount(378.75, "g")).toBe("379");
    expect(decimalsFor(10, "g")).toBe(0);
  });

  it("mg and µg have no decimals", () => {
    expect(formatAmount(2.4, "mg")).toBe("2");
    expect(formatAmount(61.6, "µg")).toBe("62");
  });

  it("never shows negative zero", () => {
    expect(roundForDisplay(-0.01, "kcal")).toBe(0);
    expect(formatAmount(-0.01, "kcal")).toBe("0");
  });

  it("adds units", () => {
    expect(formatWithUnit(62, "µg")).toBe("62 µg");
  });

  it("phrases remaining and over", () => {
    expect(formatRemaining(320, "kcal")).toBe("320 kcal left");
    expect(formatRemaining(-120, "kcal")).toBe("over by 120 kcal");
  });
});

describe("trace amounts", () => {
  it("shows one decimal for mg and µg below 1", () => {
    expect(formatAmount(0.42, "mg")).toBe("0.4");
    expect(formatAmount(0.06, "µg")).toBe("0.1");
    expect(formatAmount(0, "mg")).toBe("0");
    expect(formatAmount(1.4, "mg")).toBe("1");
  });
});
