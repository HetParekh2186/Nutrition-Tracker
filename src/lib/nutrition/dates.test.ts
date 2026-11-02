import { describe, expect, it } from "vitest";

import { addDays, ageOn, daysBetween, isIsoDate, localDate } from "./dates";

describe("localDate", () => {
  it("an 11:30 pm snack in Madison stays on the same day", () => {
    // 2026-11-02 23:30 in Chicago (CST, UTC-6) is 05:30 UTC the next day.
    const snack = new Date("2026-11-03T05:30:00Z");
    expect(localDate(snack, "America/Chicago")).toBe("2026-11-02");
    expect(localDate(snack, "UTC")).toBe("2026-11-03");
  });

  it("handles daylight saving time", () => {
    // 2026-07-01 23:30 in Chicago (CDT, UTC-5) is 04:30 UTC.
    expect(localDate(new Date("2026-07-02T04:30:00Z"), "America/Chicago")).toBe(
      "2026-07-01",
    );
  });
});

describe("date arithmetic", () => {
  it("adds days across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts days between", () => {
    expect(daysBetween("2026-10-19", "2026-11-02")).toBe(14);
    expect(daysBetween("2026-11-02", "2026-11-02")).toBe(0);
  });

  it("validates ISO dates", () => {
    expect(isIsoDate("2026-11-02")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("11/02/2026")).toBe(false);
  });

  it("computes age in whole years", () => {
    expect(ageOn("2006-11-03", "2026-11-02")).toBe(19);
    expect(ageOn("2006-11-02", "2026-11-02")).toBe(20);
  });
});
