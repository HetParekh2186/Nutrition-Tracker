import { expect, test } from "@playwright/test";

import { openQuickLog, signInAsDemo } from "./helpers";

test("log a food from search, then delete it", async ({ page, isMobile }) => {
  await signInAsDemo(page);
  const slot = page.getByRole("region", { name: "Snacks" });
  const before = await slot.getByRole("listitem").count();

  await openQuickLog(page, isMobile);
  await page.getByPlaceholder(/Search foods/).fill("egg whole raw fresh");
  await page
    .getByRole("option", { name: /Egg, whole, raw, fresh/ })
    .first()
    .click();

  // Amount step: 2 large eggs into snacks, logged with Enter.
  const amount = page.getByLabel("Amount");
  await page.getByLabel("Unit").selectOption({ label: "1 large (50 g)" });
  await amount.fill("2");
  await page.getByRole("radio", { name: "Snacks" }).check();
  await expect(page.getByText("100 g", { exact: true })).toBeVisible();
  await amount.press("Enter");

  const entry = slot
    .getByRole("button", { name: /Egg, whole, raw, fresh/ })
    .last();
  await expect(entry).toBeVisible();
  await expect(slot.getByRole("listitem")).toHaveCount(before + 1);
  await expect(entry).toBeEnabled();

  // Clean up so the demo account stays as seeded.
  await entry.click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(slot.getByRole("listitem")).toHaveCount(before);
});
