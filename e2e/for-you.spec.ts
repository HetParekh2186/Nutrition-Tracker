import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

test("Suggest dinner shows ranked suggestions with reasons", async ({
  page,
}) => {
  await signInAsDemo(page);
  await page.getByRole("link", { name: "Suggest dinner" }).click();
  await expect(page).toHaveURL(/\/for-you\?slot=dinner/);
  await expect(page.getByRole("heading", { name: "For You" })).toBeVisible();

  const cards = page.getByRole("list", { name: "Why this was suggested" });
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(2);
  // The demo excludes shellfish: the shrimp dish must never appear.
  await expect(page.getByText(/shrimp/i)).toHaveCount(0);
});

test("save and skip a suggestion", async ({ page }) => {
  await signInAsDemo(page);
  await page.goto("/for-you?slot=lunch");
  const first = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: "Not for me" }) })
    .first();
  const title =
    (await first.getByRole("link").first().textContent())?.replace(
      /^Open /,
      "",
    ) ?? "";

  const save = first.getByRole("button", { name: /^Save/ });
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "false");

  await first.getByRole("button", { name: "Not for me" }).click();
  await expect(page.getByRole("link", { name: `Open ${title}` })).toHaveCount(
    0,
  );
});
