import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

// Phase 2 "done when": a fresh account gets sensible targets in under a
// minute. Runs the flow on the demo account, which the seed resets.
test("onboarding computes targets", async ({ page }) => {
  test.setTimeout(60_000);
  await signInAsDemo(page);
  await page.goto("/onboarding");

  await page.getByRole("radio", { name: /Male/ }).check();
  await page.getByLabel("Birth date").fill("2006-01-15");
  await page.getByLabel("Height (cm)").fill("178");
  await page.getByLabel("Weight (kg)").fill("75");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("radio", { name: /Moderate/ }).check();
  await page.getByRole("radio", { name: /Maintain/ }).check();
  // The spec's worked example: 2,740 kcal, 135 g protein.
  await expect(page.getByText("2,740")).toBeVisible();
  await expect(page.getByText("135 g", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("radio", { name: /Everything/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  // Cold start: pick two meals.
  await page.getByText("Pick", { exact: true }).first().click();
  await page.getByText("Pick", { exact: true }).first().click();
  await expect(page.getByText("2 of 5 picked")).toBeVisible();
  await page.getByRole("button", { name: "Finish and see today" }).click();

  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText(/\/ 2,740 kcal/)).toBeVisible();
});
