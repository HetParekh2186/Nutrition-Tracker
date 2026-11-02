import { describe, expect, it } from "vitest";

import { isPublicPath, safeNextPath } from "./paths";

describe("isPublicPath", () => {
  it.each(["/", "/login", "/auth/confirm", "/styleguide", "/api/diary"])(
    "allows %s without a session",
    (path) => expect(isPublicPath(path)).toBe(true),
  );

  it.each(["/today", "/settings", "/loginx", "/styleguides"])(
    "requires a session for %s",
    (path) => expect(isPublicPath(path)).toBe(false),
  );
});

describe("safeNextPath", () => {
  it("keeps same-site paths with queries", () => {
    expect(safeNextPath("/today?date=2026-11-02")).toBe(
      "/today?date=2026-11-02",
    );
  });

  it.each([
    null,
    undefined,
    "",
    "today",
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
  ])("falls back to / for %s", (next) => {
    expect(safeNextPath(next)).toBe("/");
  });
});
