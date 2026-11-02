import { describe, expect, it } from "vitest";

import { CONFIDENT, matchConfidence } from "./confidence";

describe("matchConfidence", () => {
  it("is confident on a full-text match with good similarity", () => {
    expect(
      matchConfidence({ similarity: 0.6, fullText: true, usedBefore: false }),
    ).toBeGreaterThanOrEqual(CONFIDENT);
  });

  it("is unsure on a weak fuzzy match", () => {
    expect(
      matchConfidence({ similarity: 0.4, fullText: false, usedBefore: false }),
    ).toBeLessThan(CONFIDENT);
  });

  it("trusts foods the user logged before", () => {
    const fresh = matchConfidence({
      similarity: 0.5,
      fullText: true,
      usedBefore: false,
    });
    const used = matchConfidence({
      similarity: 0.5,
      fullText: true,
      usedBefore: true,
    });
    expect(used).toBeGreaterThan(fresh);
  });

  it("drops when the runner-up is nearly as good", () => {
    const clear = matchConfidence({
      similarity: 0.6,
      fullText: true,
      usedBefore: false,
      runnerUp: 0.3,
    });
    const tie = matchConfidence({
      similarity: 0.6,
      fullText: true,
      usedBefore: false,
      runnerUp: 0.58,
    });
    expect(tie).toBeLessThan(clear);
  });

  it("stays between 0 and 1", () => {
    expect(
      matchConfidence({ similarity: 1, fullText: true, usedBefore: true }),
    ).toBe(1);
    expect(
      matchConfidence({
        similarity: 0,
        fullText: false,
        usedBefore: false,
        runnerUp: 0,
      }),
    ).toBe(0);
  });
});
