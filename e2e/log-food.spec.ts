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
  // Click the visible label, as a user does; the radio itself is visually hidden.
  await page.getByRole("dialog").getByText("Snacks", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Snacks" })).toBeChecked();
  await expect(page.getByText("100 g", { exact: true })).toBeVisible();
  await amount.press("Enter");

  const entry = slot
    .getByRole("button", { name: /Egg, whole, raw, fresh/ })
    .last();
  await expect(entry).toBeVisible();
  await expect(slot.getByRole("listitem")).toHaveCount(before + 1);
  await expect(entry).toBeEnabled();

  // Editing reopens it in the unit it was logged in, with the equivalents.
  await entry.click();
  const edit = page.getByRole("dialog");
  const editAmount = edit.getByLabel("Amount");
  await expect(editAmount).toHaveValue("2");
  await expect(edit.getByLabel("Unit")).toHaveValue(/1 large/);
  await expect(edit.getByText(/^= 100 g/)).toBeVisible();
  // Switching to grams keeps the amount of food.
  await edit.getByLabel("Unit").selectOption("g");
  await expect(editAmount).toHaveValue("100");
  await editAmount.fill("150");
  await expect(edit.getByText(/3 × 1 large/)).toBeVisible();
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(entry).toContainText("150 g");

  // Clean up so the demo account stays as seeded.
  await entry.click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(slot.getByRole("listitem")).toHaveCount(before);
});

test("look up a packaged food by barcode", async ({ page, isMobile }) => {
  await signInAsDemo(page);
  await page.goto("/today");
  await openQuickLog(page, isMobile);
  await page.getByPlaceholder(/Search foods/).fill("3017620422003");
  await page.getByText("Look up barcode 3017620422003").click();
  await page.getByRole("button", { name: "Look up" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Nutella", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/^OFF/)).toBeVisible();
  await dialog.getByLabel("Amount").fill("15");
  await dialog.getByLabel("Unit").selectOption("g");
  await dialog.getByText("Snacks", { exact: true }).click();
  await dialog.getByRole("button", { name: /Log to snacks/ }).click();

  const entry = page
    .getByRole("region", { name: "Snacks" })
    .getByRole("button", { name: /Nutella/ })
    .last();
  await expect(entry).toContainText("15 g");
  await entry.click();
  await page.getByRole("button", { name: "Delete" }).click();
});

test("an unknown barcode offers a custom food that keeps the code", async ({
  page,
  isMobile,
}) => {
  const code = "681131355353";
  // Mocked so the demo account does not collect a test food every run.
  await page.route(`**/api/foods/barcode/${code}`, (route) =>
    route.fulfill({
      status: 404,
      json: { error: "No product with that barcode in Open Food Facts." },
    }),
  );
  let posted: Record<string, unknown> | null = null;
  await page.route("**/api/foods", async (route) => {
    posted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      json: {
        id: 999_999,
        name: "Trail mix",
        brand: null,
        source: "custom",
        sourceId: code,
        isCustom: true,
        per100g: { 1008: 500 },
        energyEstimated: false,
        portions: [{ id: 1, label: "1 bag", grams: 40 }],
      },
    });
  });

  await signInAsDemo(page);
  await openQuickLog(page, isMobile);
  await page.getByPlaceholder(/Search foods/).fill(code);
  await page.getByText(`Look up barcode ${code}`).click();
  await page.getByRole("button", { name: "Look up" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/not in Open Food Facts yet/)).toBeVisible();
  await dialog.getByRole("button", { name: "Create a custom food" }).click();
  await expect(dialog.getByText(`Barcode ${code} will be saved`)).toBeVisible();

  // Back returns to the barcode, not the search.
  await dialog.getByRole("button", { name: "Back to barcode" }).click();
  await expect(dialog.getByLabel("Digits under the barcode")).toHaveValue(code);
  await dialog.getByRole("button", { name: "Look up" }).click();
  await dialog.getByRole("button", { name: "Create a custom food" }).click();

  await dialog.getByLabel("Name").fill("Trail mix");
  await dialog.getByLabel("Serving").fill("1 bag");
  await dialog.getByLabel("Grams").fill("40");
  await dialog.getByLabel(/Calories/).fill("200");
  await dialog.getByLabel(/Protein/).fill("6");
  await dialog.getByLabel(/Carbs/).fill("18");
  await dialog.getByLabel(/^Fat/).fill("12");
  await dialog.getByRole("button", { name: "Save and choose amount" }).click();

  await expect(dialog.getByText("Trail mix", { exact: true })).toBeVisible();
  expect(posted).toMatchObject({ name: "Trail mix", barcode: code });
});
