import { expect, test, type Page } from "@playwright/test";

import type { FoodHit } from "../src/lib/foods/types";
import type { ParsedLogItem } from "../src/lib/log/types";

import { openQuickLog, signInAsDemo } from "./helpers";

// Flow A. The parse step is Claude, which tests never call, so its answer
// is stubbed with real search hits; matching review, grams and logging run
// against the real app.
async function hits(page: Page, q: string): Promise<FoodHit[]> {
  const res = await page.request.get(
    `/api/foods/search?q=${encodeURIComponent(q)}&limit=3`,
  );
  return ((await res.json()) as { results: FoodHit[] }).results;
}

test("log a meal described in plain English", async ({ page, isMobile }) => {
  await signInAsDemo(page);
  const eggs = await hits(page, "egg whole raw fresh");
  const toast = await hits(page, "bread french toasted");
  expect(eggs.length).toBeGreaterThan(0);
  expect(toast.length).toBeGreaterThan(1);

  const items: ParsedLogItem[] = [
    {
      text: "2 eggs",
      query: "egg, whole, raw",
      quantity: 2,
      unit: "large",
      confidence: 0.95,
      needsReview: false,
      candidates: [
        {
          food: eggs[0]!,
          grams: 100,
          portionLabel: "2 × 1 large",
          method: "portion",
        },
      ],
    },
    {
      text: "a slice of sourdough toast",
      query: "bread, sourdough, toasted",
      quantity: 1,
      unit: "slice",
      confidence: 0.5,
      needsReview: true,
      candidates: toast.map((food) => ({
        food,
        grams: 59,
        portionLabel: "1 slice, medium",
        method: "portion" as const,
      })),
    },
    {
      text: "black coffee",
      query: "coffee, brewed",
      quantity: 1,
      unit: "cup",
      confidence: 0,
      needsReview: true,
      candidates: [],
    },
  ];
  await page.route("**/api/log/parse", (route) =>
    route.fulfill({ json: { items } }),
  );

  await page.goto("/today");
  await openQuickLog(page, isMobile);
  const dialog = page.getByRole("dialog");
  await page
    .getByPlaceholder(/Search foods/)
    .fill("2 eggs and sourdough toast");
  await dialog.getByText(/in plain English/).click();

  await expect(dialog.getByLabel("What did you eat?")).toHaveValue(
    "2 eggs and sourdough toast",
  );
  await dialog.getByRole("button", { name: "Match foods" }).click();

  const matched = dialog.getByRole("list", { name: "Matched foods" });
  await expect(matched.getByRole("listitem")).toHaveCount(3);
  // The weak match asks for a check, the unmatched one says so.
  await expect(matched.getByText("Check this match")).toHaveCount(1);
  await expect(matched.getByText(/No food matched/)).toBeVisible();

  // Pick the toast's second candidate and change the eggs to 120 g.
  await dialog
    .getByLabel("Food", { exact: true })
    .nth(1)
    .selectOption({ index: 1 });
  await dialog.getByLabel("Grams", { exact: true }).first().fill("120");

  await dialog.getByText("Breakfast", { exact: true }).click();
  await dialog
    .getByRole("button", { name: "Log 2 items to breakfast" })
    .click();
  await expect(page.getByText("Logged 2 items to breakfast")).toBeVisible();

  const breakfast = page.getByRole("region", { name: "Breakfast" });
  const egg = breakfast
    .getByRole("button", { name: new RegExp(eggs[0]!.name.slice(0, 12)) })
    .last();
  await expect(egg).toContainText("120 g");
  const bread = breakfast
    .getByRole("button", {
      name: new RegExp(toast[1]!.name.slice(0, 12).replace(/[()]/g, ".")),
    })
    .last();
  await expect(bread).toBeVisible();

  for (const entry of [egg, bread]) {
    await entry.click();
    await page.getByRole("button", { name: "Delete" }).click();
  }
});
