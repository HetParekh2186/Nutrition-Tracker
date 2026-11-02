import { describe, expect, it } from "vitest";

import { fdcUnit, portionLabel, resolveNutrients } from "./fdc";

describe("fdcUnit", () => {
  it("maps FDC unit names", () => {
    expect(fdcUnit("UG")).toBe("µg");
    expect(fdcUnit("kcal")).toBe("kcal");
    expect(fdcUnit("IU")).toBeUndefined();
  });
});

describe("resolveNutrients", () => {
  it("prefers the primary id", () => {
    const raw = new Map([
      [1008, 165],
      [2047, 170],
    ]);
    expect(resolveNutrients(raw, [1008]).get(1008)).toBe(165);
  });

  it("falls back to Atwater specific, then general energy", () => {
    expect(
      resolveNutrients(
        new Map([
          [2047, 170],
          [2048, 168],
        ]),
        [1008],
      ).get(1008),
    ).toBe(168);
    expect(resolveNutrients(new Map([[2047, 170]]), [1008]).get(1008)).toBe(
      170,
    );
  });

  it("falls back to carbohydrate by summation and sugars total", () => {
    const out = resolveNutrients(
      new Map([
        [1050, 12],
        [1063, 4],
      ]),
      [1005, 2000],
    );
    expect(out.get(1005)).toBe(12);
    expect(out.get(2000)).toBe(4);
  });

  it("leaves missing nutrients unknown", () => {
    expect(resolveNutrients(new Map(), [1185]).has(1185)).toBe(false);
  });
});

describe("portionLabel", () => {
  it("builds SR Legacy labels from the modifier", () => {
    expect(
      portionLabel({
        amount: "1",
        unitName: "undetermined",
        modifier: "cup, chopped",
        portionDescription: "",
      }),
    ).toBe("1 cup, chopped");
  });

  it("builds Foundation labels from the measure unit", () => {
    expect(
      portionLabel({
        amount: "2.0",
        unitName: "tablespoon",
        modifier: "",
        portionDescription: "",
      }),
    ).toBe("2 tablespoon");
  });

  it("keeps fractional amounts readable", () => {
    expect(
      portionLabel({
        amount: "0.5",
        unitName: "cup",
        modifier: "",
        portionDescription: "",
      }),
    ).toBe("0.5 cup");
  });

  it("uses the description alone when there is no amount", () => {
    expect(
      portionLabel({
        amount: "",
        modifier: "",
        portionDescription: "1 large",
      }),
    ).toBe("1 large");
  });
});
