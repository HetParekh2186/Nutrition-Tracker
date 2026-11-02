import { describe, expect, it } from "vitest";

import { N } from "./catalog";
import {
  addMacros,
  macrosOf,
  scaleMacros,
  subtractMacros,
  ZERO_MACROS,
} from "./macros";

describe("macrosOf", () => {
  it("reads stored energy and macros", () => {
    expect(
      macrosOf({
        [N.energy]: 165,
        [N.protein]: 31,
        [N.carbs]: 0,
        [N.fat]: 3.6,
        [N.fiber]: 0,
      }),
    ).toEqual({
      kcal: 165,
      energyEstimated: false,
      proteinG: 31,
      carbsG: 0,
      fatG: 3.6,
      fiberG: 0,
    });
  });

  it("estimates missing energy and flags it", () => {
    const m = macrosOf({ [N.protein]: 10, [N.carbs]: 20, [N.fat]: 5 });
    expect(m.kcal).toBe(165);
    expect(m.energyEstimated).toBe(true);
    expect(m.fiberG).toBe(0);
  });
});

describe("macro arithmetic", () => {
  const a = { kcal: 500, proteinG: 30, carbsG: 50, fatG: 20, fiberG: 5 };

  it("adds, subtracts and scales", () => {
    expect(addMacros(a, a)).toEqual(scaleMacros(a, 2));
    expect(subtractMacros(a, a)).toEqual(ZERO_MACROS);
    expect(scaleMacros(a, 0.5).kcal).toBe(250);
  });
});
