// Screenshots for review and the README. Not part of the normal run:
//   SCREENS_DIR=./screens pnpm exec playwright test screens
import { expect, test, type Page } from "@playwright/test";

import { signInAsDemo } from "./helpers";

const DIR = process.env.SCREENS_DIR;

test.skip(!DIR, "Set SCREENS_DIR to capture screenshots");

const SAMPLE: { q: string; slot: string; grams: number }[] = [
  { q: "oats rolled old fashioned", slot: "breakfast", grams: 60 },
  { q: "milk whole 3.25", slot: "breakfast", grams: 240 },
  { q: "banana raw", slot: "breakfast", grams: 118 },
  { q: "chicken breast meat only cooked roasted", slot: "lunch", grams: 180 },
  { q: "rice white long grain cooked", slot: "lunch", grams: 200 },
  { q: "broccoli raw", slot: "lunch", grams: 120 },
  { q: "yogurt greek plain nonfat", slot: "snack", grams: 170 },
  { q: "almonds", slot: "snack", grams: 28 },
];

async function today(page: Page): Promise<string> {
  const res = await page.request.get("/api/summary/day");
  return ((await res.json()) as { date: string }).date;
}

test("today with a logged day", async ({ page }, info) => {
  await signInAsDemo(page);
  const date = await today(page);
  const ids: number[] = [];
  for (const item of SAMPLE) {
    const search = await page.request.get(
      `/api/foods/search?q=${encodeURIComponent(item.q)}&limit=1`,
    );
    const { results } = (await search.json()) as {
      results: { id: number }[];
    };
    const food = results[0];
    if (!food) continue;
    const res = await page.request.post("/api/diary", {
      data: {
        date,
        mealSlot: item.slot,
        item: { kind: "food", foodId: food.id, quantityG: item.grams },
      },
    });
    ids.push(((await res.json()) as { id: number }).id);
  }

  try {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/today");
      await expect(page.getByText("kcal remaining")).toBeVisible();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `${DIR}/today-${info.project.name}-${scheme}.png`,
        fullPage: true,
      });
    }
    await page.emulateMedia({ colorScheme: "light" });
    if (info.project.name === "desktop") {
      await page.keyboard.press("Control+k");
      await page.getByPlaceholder(/Search foods/).fill("salmon");
      await expect(page.getByRole("option").first()).toBeVisible();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${DIR}/palette-desktop.png` });
    }
  } finally {
    for (const id of ids) await page.request.delete(`/api/diary/${id}`);
  }
});

test("insights, settings and onboarding", async ({ page }, info) => {
  await signInAsDemo(page);
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/insights?range=30");
    await expect(page.getByText("Average vs target")).toBeVisible();
    await page.getByRole("button", { name: /^Vitamin D:/ }).click();
    await expect(
      page.getByText(/Where your vitamin d comes from/i),
    ).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${DIR}/insights-${info.project.name}-${scheme}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Targets" })).toBeVisible();
  await page.screenshot({
    path: `${DIR}/settings-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Daily target")).toBeVisible();
  await page.screenshot({
    path: `${DIR}/onboarding-${info.project.name}.png`,
    fullPage: true,
  });
});

test("recipes library and detail", async ({ page }, info) => {
  await signInAsDemo(page);
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/recipes");
    await expect(
      page.getByRole("heading", { name: "Starter library" }),
    ).toBeVisible();
    await page.screenshot({
      path: `${DIR}/recipes-${info.project.name}-${scheme}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page
    .getByRole("link", { name: "Open Salmon teriyaki rice bowl" })
    .click();
  await expect(page.getByRole("heading", { name: "Method" })).toBeVisible();
  await page.screenshot({
    path: `${DIR}/recipe-${info.project.name}.png`,
    fullPage: true,
  });
});
