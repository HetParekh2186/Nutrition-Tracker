import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

test("scale a starter recipe and log it as eaten", async ({ page }) => {
  await signInAsDemo(page);
  await page.goto("/recipes");
  await page.getByRole("link", { name: "Open Chicken tikka masala" }).click();
  await expect(
    page.getByRole("heading", { name: "Ingredients" }),
  ).toBeVisible();

  // 4 servings -> 2 halves the chicken from 600 g to 300 g.
  const chicken = page
    .getByRole("listitem")
    .filter({ hasText: "600 g boneless chicken" });
  await expect(chicken.getByText("600 g", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Fewer servings" }).click();
  await page.getByRole("button", { name: "Fewer servings" }).click();
  await expect(chicken.getByText("300 g", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Log as eaten" }).click();
  await page.getByRole("radio", { name: "Dinner" }).check();
  await page.getByRole("button", { name: "Log to dinner" }).click();
  await expect(page.getByText("Logged to dinner")).toBeVisible();

  await page.goto("/today");
  const dinner = page.getByRole("region", { name: "Dinner" });
  const entry = dinner
    .getByRole("button", { name: /Chicken tikka masala/ })
    .last();
  await expect(entry).toBeVisible();
  await expect(entry).toContainText("1 serving");
  await entry.click();
  await page.getByRole("button", { name: "Delete" }).click();
});

test("create a recipe by hand", async ({ page }) => {
  await signInAsDemo(page);
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill("E2E garlic rice");
  await page.getByLabel("Servings").fill("2");
  await page
    .getByLabel("Ingredient 1", { exact: true })
    .fill("rice, white, long-grain, raw");
  await page.getByLabel("Ingredient 1 grams").fill("200");
  await page.getByLabel("Ingredient 2", { exact: true }).fill("garlic, raw");
  await page.getByLabel("Ingredient 2 grams").fill("10");
  await page
    .getByLabel("Step 1", { exact: true })
    .fill("Cook the rice with the garlic.");
  // Auto-match runs on blur; wait for both matches.
  await page.getByLabel("Ingredient 3", { exact: true }).click();
  await expect(page.getByText("Match a food")).toHaveCount(1);
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(
    page.getByRole("heading", { name: "Per serving", exact: true }),
  ).toBeVisible();
  const kcal = page
    .locator("section", {
      has: page.getByRole("heading", { name: "Per serving", exact: true }),
    })
    .locator(".num")
    .first();
  await expect(kcal).not.toHaveText("0");

  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
});
