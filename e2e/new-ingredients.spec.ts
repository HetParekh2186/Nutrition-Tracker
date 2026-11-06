// Recipes build on the foods you log: anything new is asked about, and
// what you lack can be swapped for foods you already eat.
import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

test("a recipe asks about ingredients you have not logged", async ({
  page,
}) => {
  // Mocked so the demo's kitchen list stays as seeded and no AI is called.
  let added: unknown = null;
  await page.route("**/api/pantry", async (route) => {
    added = route.request().postDataJSON();
    await route.fulfill({ json: { pantry: ["strawberries"] } });
  });
  let adapt: Record<string, unknown> | null = null;
  await page.route("**/api/recipes/*/adapt", async (route) => {
    adapt = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      contentType: "application/x-ndjson",
      body: `${JSON.stringify({ type: "status", message: "Adapting the recipe" })}\n`,
    });
  });

  await signInAsDemo(page);
  await page.goto("/recipes");
  await page
    .getByRole("link", { name: "Open Greek yogurt berry parfait" })
    .click();

  const panel = page.getByRole("region", { name: "New to you" });
  await expect(panel).toBeVisible();
  // The demo logs yogurt and blueberries, so only these are new.
  await expect(panel.getByRole("listitem")).toHaveText([
    /strawberries/i,
    /honey/i,
  ]);
  const ingredients = page.getByRole("region", { name: "Ingredients" });
  await expect(ingredients.getByText("New to you")).toHaveCount(2);

  await panel
    .getByRole("group", { name: "Do you have strawberries?" })
    .getByRole("button", { name: "I have it" })
    .click();
  await expect.poll(() => added).toEqual({ items: ["strawberries"] });
  await expect(ingredients.getByText("New to you")).toHaveCount(1);

  await panel
    .getByRole("group", { name: "Do you have honey?" })
    .getByRole("button", { name: "I don't" })
    .click();
  await panel
    .getByRole("button", { name: "Swap honey for foods I eat" })
    .click();
  await expect.poll(() => adapt).not.toBeNull();
  expect(adapt).toMatchObject({ missing: ["honey"] });
});
