import { describe, expect, it } from "vitest";

import { commonName } from "./names";

const usda = (name: string) => commonName(name, "usda_sr_legacy");

describe("commonName", () => {
  it("drops catalog filler", () => {
    expect(
      usda("Chicken, broilers or fryers, breast, meat only, cooked, roasted"),
    ).toBe("Chicken breast, cooked, roasted");
    expect(usda("Avocados, raw, all commercial varieties")).toBe(
      "Avocados, raw",
    );
    expect(
      usda(
        "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",
      ),
    ).toBe("Apples, raw, with skin");
  });

  it("puts the kind first where people do", () => {
    expect(usda("Oil, olive, salad or cooking")).toBe("Olive oil");
    expect(usda("Yogurt, Greek, plain, nonfat")).toBe(
      "Greek yogurt, plain, nonfat",
    );
    expect(usda("Rice, white, long-grain, regular, enriched, cooked")).toBe(
      "White rice, long-grain, cooked",
    );
    expect(usda("Beef, ground, 90% lean meat / 10% fat, raw")).toBe(
      "Ground beef, 90% lean meat / 10% fat, raw",
    );
  });

  it("drops category heads", () => {
    expect(usda("Nuts, almonds")).toBe("Almonds");
    expect(usda("Beverages, coffee, brewed, prepared with tap water")).toBe(
      "Coffee, brewed, prepared with tap water",
    );
    expect(usda("Fish, salmon, Atlantic, farmed, cooked, dry heat")).toBe(
      "Salmon, atlantic, farmed, cooked",
    );
  });

  it("keeps raw and cooked apart however long the name", () => {
    const name = (state: string) =>
      usda(
        `Beef, rib, large end (ribs 6-9), separable lean and fat, trimmed to 0" fat, choice, ${state}`,
      );
    expect(name("raw")).toBe("Beef, rib, large end, raw");
    expect(name("cooked, roasted")).toBe(
      "Beef, rib, large end, cooked, roasted",
    );
  });

  it("softens all-caps brands", () => {
    expect(usda("APPLEBEE'S, chili")).toBe("Applebee's, chili");
  });

  it("leaves product names from other sources alone", () => {
    expect(commonName("Nutella", "off")).toBe("Nutella");
    expect(commonName("Trail mix, MY BLEND", "custom")).toBe(
      "Trail mix, MY BLEND",
    );
  });
});
