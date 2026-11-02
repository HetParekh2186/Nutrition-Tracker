import { describe, expect, it } from "vitest";

import { N } from "./catalog";
import type { NutrientMap } from "./math";
import { datesBetween, summarizeRange, topSources } from "./range";

describe("datesBetween", () => {
  it("is inclusive and crosses months", () => {
    expect(datesBetween("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(datesBetween("2026-11-02", "2026-11-01")).toEqual([]);
  });
});

describe("summarizeRange", () => {
  const entries: { date: string; nutrients: NutrientMap }[] = [
    {
      date: "2026-11-01",
      nutrients: { [N.energy]: 500, [N.protein]: 40, 1185: 10 },
    },
    { date: "2026-11-01", nutrients: { [N.energy]: 700, [N.protein]: 20 } },
    {
      date: "2026-11-03",
      nutrients: { [N.energy]: 1800, [N.protein]: 120, 1185: 50 },
    },
  ];
  const s = summarizeRange("2026-11-01", "2026-11-03", entries);

  it("returns every day, with zero for unlogged days", () => {
    expect(s.days.map((d) => d.entryCount)).toEqual([2, 0, 1]);
    expect(s.days[0]?.macros.kcal).toBe(1200);
    expect(s.days[1]?.macros.kcal).toBe(0);
  });

  it("averages over logged days only", () => {
    expect(s.loggedDays).toBe(2);
    expect(s.averages[N.energy]).toBe(1500);
    expect(s.averageMacros.proteinG).toBe(90);
    expect(s.averages[1185]).toBe(30);
  });

  it("reports coverage across all items", () => {
    expect(s.coverage[1185]).toEqual({ known: 2, total: 3 });
  });

  it("handles a range with nothing logged", () => {
    const empty = summarizeRange("2026-11-01", "2026-11-02", []);
    expect(empty.loggedDays).toBe(0);
    expect(empty.averageMacros.kcal).toBe(0);
    expect(empty.averages).toEqual({});
  });
});

describe("topSources", () => {
  it("groups by food, sorts by amount and computes shares", () => {
    const sources = topSources(
      [
        { key: "f1", name: "Spinach", nutrients: { 1185: 400 } },
        { key: "f2", name: "Broccoli", nutrients: { 1185: 100 } },
        { key: "f1", name: "Spinach", nutrients: { 1185: 300 } },
        { key: "f3", name: "Rice", nutrients: {} },
      ],
      1185,
    );
    expect(sources.map((s) => s.name)).toEqual(["Spinach", "Broccoli"]);
    expect(sources[0]).toMatchObject({ amount: 700, count: 2, share: 0.875 });
  });

  it("respects the limit", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      key: `f${i}`,
      name: `Food ${i}`,
      nutrients: { [N.protein]: i + 1 },
    }));
    expect(topSources(items, N.protein, 3).map((s) => s.key)).toEqual([
      "f11",
      "f10",
      "f9",
    ]);
  });
});
