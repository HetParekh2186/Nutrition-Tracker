// Guards the phone layout with the on-screen keyboard up. iOS Safari draws
// the keyboard over fixed elements instead of resizing the page, which left
// the Log food sheet hidden behind it. Chromium cannot raise a real
// keyboard, so the test sets the visible-area variables the app derives
// from window.visualViewport, as iOS would report them.
import { expect, type Page, test } from "@playwright/test";

import { openQuickLog, signInAsDemo } from "./helpers";

const KEYBOARD = 340;

async function raiseKeyboard(page: Page) {
  const height = page.viewportSize()!.height;
  await page.evaluate(
    ({ visible, covered }) => {
      const root = document.documentElement.style;
      root.setProperty("--vv-top", "0px");
      root.setProperty("--vv-height", `${visible}px`);
      root.setProperty("--vv-bottom", `${covered}px`);
    },
    { visible: height - KEYBOARD, covered: KEYBOARD },
  );
  return height - KEYBOARD;
}

async function bottomOf(page: Page, selector: string) {
  const box = await page.locator(selector).last().boundingBox();
  return box!.y + box!.height;
}

test.beforeEach(({ isMobile }) => {
  test.skip(!isMobile, "The on-screen keyboard is a phone concern");
});

test("the app tracks the visible area", async ({ page }) => {
  await signInAsDemo(page);
  const height = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--vv-height"),
  );
  expect(height).toBe(`${page.viewportSize()!.height}px`);
});

test("Log food stays above the keyboard", async ({ page, isMobile }) => {
  await signInAsDemo(page);
  await openQuickLog(page, isMobile);
  const top = await raiseKeyboard(page);

  const search = page.getByPlaceholder(/Search foods/);
  await expect(search).toBeInViewport();
  await expect
    .poll(() => bottomOf(page, "[data-vaul-drawer]"))
    .toBeLessThanOrEqual(top + 1);
  const box = (await search.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(top);
});

test("a dialog stays above the keyboard", async ({ page }) => {
  await signInAsDemo(page);
  const { date } = (await (
    await page.request.get("/api/summary/day")
  ).json()) as { date: string };
  const { results } = (await (
    await page.request.get("/api/foods/search?q=banana%20raw&limit=1")
  ).json()) as { results: { id: number }[] };
  const res = await page.request.post("/api/diary", {
    data: {
      date,
      mealSlot: "snack",
      item: { kind: "food", foodId: results[0]!.id, quantityG: 120 },
    },
  });
  const { id } = (await res.json()) as { id: number };

  try {
    await page.goto("/today");
    await page
      .getByRole("region", { name: "Snacks" })
      .getByRole("button", { name: /banana/i })
      .last()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Amount")).toBeVisible();
    const top = await raiseKeyboard(page);
    await expect
      .poll(() => bottomOf(page, '[data-slot="dialog-content"]'))
      .toBeLessThanOrEqual(top);
    // Taller content scrolls inside the dialog, not under the keyboard.
    const save = dialog.getByRole("button", { name: "Save" });
    await save.scrollIntoViewIfNeeded();
    const box = (await save.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(top);
  } finally {
    await page.request.delete(`/api/diary/${id}`);
  }
});
