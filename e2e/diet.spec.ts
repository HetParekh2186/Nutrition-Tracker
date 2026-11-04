import { expect, test, type Locator } from "@playwright/test";

import { signInAsDemo } from "./helpers";

/**
 * The inputs are visually hidden inside their labels, so click the label,
 * centred first so the sticky header is not over it.
 */
async function check(control: Locator) {
  const label = control.locator("xpath=ancestor::label");
  await label.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await label.click();
  await expect(control).toBeChecked();
}

// A diet between the presets: vegetarian, but eats chicken and eggs. Saved,
// reloaded, then put back so other specs see the demo's usual diet.
test("builds a custom diet from a preset", async ({ page }) => {
  test.setTimeout(60_000);
  await signInAsDemo(page);
  await page.goto("/settings");

  const save = page.getByRole("button", { name: "Save food rules" });
  const summary = page.getByRole("status").filter({ hasText: "Your diet" });

  await check(page.getByRole("radio", { name: /^Vegetarian/ }));
  await expect(summary).toHaveText("Your diet: Vegetarian");
  await check(page.getByRole("checkbox", { name: "Chicken" }));
  await check(page.getByRole("checkbox", { name: "Eggs" }));
  await expect(summary).toHaveText(
    "Your diet: Eggetarian, plus chicken (custom)",
  );
  // No preset matches a custom set.
  await expect(
    page.getByRole("radio", { name: /^Vegetarian/ }),
  ).not.toBeChecked();

  await save.click();
  await expect(page.getByText("Food rules saved")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Chicken" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Beef" })).not.toBeChecked();
  await expect(summary).toHaveText(
    "Your diet: Eggetarian, plus chicken (custom)",
  );

  await check(page.getByRole("radio", { name: /^Everything/ }));
  await expect(page.getByRole("checkbox", { name: "Beef" })).toBeChecked();
  await save.click();
  await expect(page.getByText("Food rules saved")).toBeVisible();
});
