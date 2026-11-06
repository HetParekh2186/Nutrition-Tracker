// The phone's navigation: four tabs with Log in the middle, Settings in the
// header, and Sign out inside Settings rather than a stray header icon.
import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

test.beforeEach(({ isMobile }) => {
  test.skip(!isMobile, "The tab bar is the phone layout");
});

test("the tab bar has Log in the middle and marks the current tab", async ({
  page,
}) => {
  await signInAsDemo(page);
  const bar = page.getByRole("navigation", { name: "Main" });
  await expect(bar.getByRole("listitem")).toHaveText([
    "Today",
    "For You",
    "Log",
    "Foods",
    "Insights",
  ]);
  await expect(bar.getByRole("link", { name: "Today" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await bar.getByRole("link", { name: "Foods" }).click();
  await expect(page).toHaveURL(/\/foods/);
  await expect(bar.getByRole("link", { name: "Foods" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await bar.getByRole("button", { name: "Log food" }).click();
  await expect(page.getByPlaceholder(/Search foods/)).toBeVisible();
});

test("Settings is in the header, and Sign out is inside it", async ({
  page,
}) => {
  await signInAsDemo(page);
  await expect(page.getByRole("button", { name: /Sign out/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings/);
  await expect(
    page.getByRole("heading", { name: "Account", level: 2 }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("Today puts meals on the first screen", async ({ page }) => {
  await signInAsDemo(page);
  await expect(page.getByRole("heading", { name: "Meals" })).toBeVisible();
  const box = (await page
    .getByRole("heading", { name: "Meals" })
    .boundingBox())!;
  // Within about one and a half screens, not below the full-height ring.
  expect(box.y).toBeLessThan(page.viewportSize()!.height * 1.5);
});
