import { describe, expect, it } from "vitest";

import { prefixTsQuery } from "./query";

describe("prefixTsQuery", () => {
  it("makes every word a prefix match", () => {
    expect(prefixTsQuery("Chicken brea")).toBe("chicken:* & brea:*");
  });

  it("strips tsquery operators and punctuation", () => {
    expect(prefixTsQuery("egg & (yolk) | !raw:*")).toBe(
      "egg:* & yolk:* & raw:*",
    );
  });

  it("keeps accented letters and numbers", () => {
    expect(prefixTsQuery("jalapeño 2%")).toBe("jalapeño:* & 2:*");
  });

  it("returns null for blank input", () => {
    expect(prefixTsQuery("  -- ")).toBeNull();
  });
});
