// Automated WCAG 2.1 AA checks with axe, in both themes. Catches missing
// names, bad ARIA and contrast; keyboard flows are covered by the other
// specs.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signInAsDemo } from "./helpers";

const PAGES = [
  "/today",
  "/for-you",
  "/recipes",
  "/insights",
  "/settings",
  "/styleguide",
];

async function scan(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // The Next.js dev overlay is not part of the app.
    .exclude("nextjs-portal")
    .analyze();
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
}

for (const scheme of ["light", "dark"] as const) {
  test(`no axe violations, ${scheme} theme`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: scheme });
    await signInAsDemo(page);
    const found: Record<string, unknown> = {};
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator("main, #main").first()).toBeVisible();
      await page.waitForTimeout(400);
      const v = await scan(page);
      if (v.length) found[path] = v;
    }
    // Recipe detail and Cook Mode.
    await page.goto("/recipes");
    await page.getByRole("link", { name: "Open Chicken tikka masala" }).click();
    await expect(
      page.getByRole("heading", { name: "Ingredients" }),
    ).toBeVisible({ timeout: 15_000 });
    const detail = await scan(page);
    if (detail.length) found["/recipes/[id]"] = detail;

    expect(found).toEqual({});
  });
}

test("login page has no axe violations", async ({ page }) => {
  await page.goto("/login");
  expect(await scan(page)).toEqual([]);
});
