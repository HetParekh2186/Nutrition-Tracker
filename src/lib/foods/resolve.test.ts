import { describe, expect, it } from "vitest";

import { queryCoverage, relaxedQueries } from "./resolve";

describe("relaxedQueries", () => {
  it("drops leading variety words, keeping the descriptor", () => {
    expect(relaxedQueries("basmati rice, dry")).toEqual(["rice, dry", "rice"]);
  });

  it("handles queries without a comma", () => {
    expect(relaxedQueries("smoked sweet paprika")).toEqual([
      "sweet paprika",
      "paprika",
    ]);
  });

  it("removes parentheticals", () => {
    expect(relaxedQueries("chickpeas (canned), drained")).toEqual([
      "chickpeas",
    ]);
  });

  it("returns nothing for a single word", () => {
    expect(relaxedQueries("butter")).toEqual([]);
  });
});

describe("queryCoverage", () => {
  it("is 1 for the original query", () => {
    expect(queryCoverage("garlic, raw", "garlic, raw")).toBe(1);
  });

  it("counts the share of original words kept", () => {
    expect(queryCoverage("masala", "garam masala")).toBe(0.5);
    expect(queryCoverage("rice, dry", "basmati rice, dry")).toBeCloseTo(2 / 3);
  });
});
