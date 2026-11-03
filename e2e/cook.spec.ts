import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

test("cook a recipe step by step and log a serving", async ({ page }) => {
  await signInAsDemo(page);
  await page.goto("/recipes");
  await page.getByRole("link", { name: "Open Chicken tikka masala" }).click();
  await page.getByRole("button", { name: "Start cooking" }).click();
  await expect(page).toHaveURL(/\/cook\//);

  const progress = page.getByRole("list", { name: "Progress" });
  const total = await progress.getByRole("listitem").count();
  expect(total).toBeGreaterThan(1);
  await expect(page.getByRole("region", { name: "Step 1" })).toBeVisible();

  // Arrow keys move between steps.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("region", { name: "Step 2" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("region", { name: "Step 1" })).toBeVisible();

  // The ingredient checklist keeps ticks.
  await page.getByRole("button", { name: /Ingredients/ }).click();
  const first = page.getByRole("dialog").getByRole("checkbox").first();
  await first.check();
  await expect(first).toBeChecked();
  await page.getByRole("button", { name: "Close ingredients" }).click();

  // Jump to a step with a timer, if the recipe has one, and start it.
  for (let i = 1; i <= total; i++) {
    const timer = page.getByRole("button", { name: /^Start .* timer$/ });
    if (await timer.isVisible()) {
      await timer.click();
      await expect(page.getByRole("timer")).toBeVisible();
      break;
    }
    if (i < total) await page.getByRole("button", { name: "Next" }).click();
  }

  await page.getByRole("button", { name: `Go to step ${total}` }).click();
  await page.getByRole("button", { name: "Done, log 1 serving" }).click();
  await expect(page.getByText("Logged 1 serving")).toBeVisible();
  await expect(page).toHaveURL(/\/today/);

  const entry = page
    .getByRole("button", { name: /Chicken tikka masala/ })
    .last();
  await expect(entry).toBeVisible();
  await entry.click();
  await page.getByRole("button", { name: "Delete" }).click();
});
