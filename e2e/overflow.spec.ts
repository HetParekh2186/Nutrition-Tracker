// Guards the phone layout: no element may push the page wider than the
// viewport (SPEC.md: no horizontal scroll at phone width). Logs foods with
// long USDA names first, since those are what break layouts.
import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

const LONG_NAMES = [
  "chicken broilers fryers breast meat only cooked roasted",
  "milk whole 3.25 milkfat added vitamin d",
];

test("no horizontal overflow on Today with long food names", async ({
  page,
}) => {
  await signInAsDemo(page);
  const { date } = (await (
    await page.request.get("/api/summary/day")
  ).json()) as { date: string };
  const ids: number[] = [];
  for (const q of LONG_NAMES) {
    const { results } = (await (
      await page.request.get(
        `/api/foods/search?q=${encodeURIComponent(q)}&limit=1`,
      )
    ).json()) as { results: { id: number }[] };
    if (!results[0]) continue;
    const res = await page.request.post("/api/diary", {
      data: {
        date,
        mealSlot: "lunch",
        item: { kind: "food", foodId: results[0].id, quantityG: 150 },
      },
    });
    ids.push(((await res.json()) as { id: number }).id);
  }

  try {
    await page.goto("/today");
    await expect(page.getByText("kcal remaining")).toBeVisible();
    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((el) => el.getBoundingClientRect().right > vw + 1)
        .slice(0, 8)
        .map(
          (el) =>
            `${el.tagName.toLowerCase()} "${el.className.toString().slice(0, 70)}" right=${Math.round(el.getBoundingClientRect().right)}`,
        );
      return { vw, scroll: document.documentElement.scrollWidth, offenders };
    });
    expect(report.scroll, report.offenders.join("\n")).toBeLessThanOrEqual(
      report.vw,
    );
  } finally {
    for (const id of ids) await page.request.delete(`/api/diary/${id}`);
  }
});

for (const path of ["/insights?range=90", "/settings", "/onboarding"]) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await signInAsDemo(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { vw, scroll } = await page.evaluate(() => ({
      vw: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(vw);
  });
}
