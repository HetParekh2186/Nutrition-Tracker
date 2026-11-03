// README screenshots and the Flow B frames for the demo GIF. Not part of
// the normal run:
//   MEDIA_DIR=./docs/media pnpm exec playwright test readme-media --project=desktop
//   python scripts/make-gif.py ./docs/media/flow-b ./docs/media/flow-b.gif
import { expect, test, type Page } from "@playwright/test";

import type { FoodHit } from "../src/lib/foods/types";
import type { ParsedLogItem } from "../src/lib/log/types";

import { signInAsDemo } from "./helpers";

const DIR = process.env.MEDIA_DIR;

test.skip(!DIR, "Set MEDIA_DIR to capture README media");
test.use({ viewport: { width: 1280, height: 800 } });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

test("feature screenshots", async ({ page }) => {
  test.setTimeout(180_000);
  await signInAsDemo(page);

  await page.goto("/today");
  await expect(page.getByText("kcal remaining")).toBeVisible();
  await shot(page, "today");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.getByText("kcal remaining")).toBeVisible();
  await shot(page, "today-dark");
  await page.emulateMedia({ colorScheme: "light" });

  // Plain-English logging, with the parse step stubbed (no API key here).
  const hits = async (q: string) =>
    (
      (await (
        await page.request.get(
          `/api/foods/search?q=${encodeURIComponent(q)}&limit=3`,
        )
      ).json()) as { results: FoodHit[] }
    ).results;
  const [eggs, toast, butter] = await Promise.all([
    hits("egg whole raw fresh"),
    hits("bread french toasted"),
    hits("butter salted"),
  ]);
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
      confidence: 0.55,
      needsReview: true,
      candidates: toast.map((food) => ({
        food,
        grams: 59,
        portionLabel: "1 slice, medium",
        method: "portion" as const,
      })),
    },
    {
      text: "with butter",
      query: "butter, salted",
      quantity: 1,
      unit: "tsp",
      confidence: 0.9,
      needsReview: false,
      candidates: [
        {
          food: butter[0]!,
          grams: 4.7,
          portionLabel: "1 tsp",
          method: "volume",
        },
      ],
    },
  ];
  await page.route("**/api/log/parse", (route) =>
    route.fulfill({ json: { items } }),
  );
  await page.keyboard.press("Control+k");
  await page
    .getByPlaceholder(/Search foods/)
    .fill("2 eggs and a slice of sourdough toast with butter");
  await page.getByText(/in plain English/).click();
  await page.getByRole("button", { name: "Match foods" }).click();
  await expect(page.getByRole("list", { name: "Matched foods" })).toBeVisible();
  await shot(page, "plain-english");
  await page.keyboard.press("Escape");

  await page.goto("/for-you?slot=dinner");
  await expect(
    page.getByRole("list", { name: "Why this was suggested" }).first(),
  ).toBeVisible();
  await page.mouse.wheel(0, 260);
  await shot(page, "for-you");

  await page.goto("/recipes");
  await page.getByRole("link", { name: "Open Chicken tikka masala" }).click();
  await expect(
    page.getByRole("heading", { name: "Ingredients" }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Ingredients" })
    .scrollIntoViewIfNeeded();
  await shot(page, "recipe");

  await page.goto("/insights");
  await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
  await shot(page, "insights");
  await page.getByRole("region", { name: "Impact" }).scrollIntoViewIfNeeded();
  await shot(page, "impact");
});

test("Flow B frames: suggest, cook, log", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1000, height: 640 });
  await signInAsDemo(page);
  let n = 0;
  const frame = async () => {
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${DIR}/flow-b/${String(n++).padStart(2, "0")}.png`,
    });
  };

  await page.goto("/today");
  await expect(page.getByText("kcal remaining")).toBeVisible();
  await frame();
  await page.getByRole("link", { name: "Suggest dinner" }).click();
  await expect(
    page.getByRole("list", { name: "Why this was suggested" }).first(),
  ).toBeVisible();
  await page
    .getByRole("list", { name: "Why this was suggested" })
    .first()
    .scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await frame();

  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: "Not for me" }) })
    .first();
  await card.getByRole("link").first().click();
  await expect(
    page.getByRole("heading", { name: "Ingredients" }),
  ).toBeVisible();
  await frame();

  await page.getByRole("button", { name: "Start cooking" }).click();
  await expect(page).toHaveURL(/\/cook\//);
  await expect(page.getByRole("region", { name: "Step 1" })).toBeVisible();
  await frame();
  const total = await page
    .getByRole("list", { name: "Progress" })
    .getByRole("listitem")
    .count();
  for (let i = 2; i <= total; i++) {
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("region", { name: `Step ${i}` })).toBeVisible();
    const timer = page
      .getByRole("region", { name: `Step ${i}` })
      .getByRole("button", { name: /^Start .* timer$/ });
    if (await timer.isVisible()) await timer.click();
    await frame();
  }
  await page.getByRole("button", { name: "Done, log 1 serving" }).click();
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText("Logged 1 serving")).toBeVisible();
  await frame();

  // Leave the demo diary as it was.
  const res = await page.request.get("/api/diary");
  const day = (await res.json()) as {
    slots: Record<string, { id: number; loggedVia: string }[]>;
  };
  for (const entries of Object.values(day.slots)) {
    for (const e of entries) {
      if (e.loggedVia === "cook_mode") {
        await page.request.delete(`/api/diary/${e.id}`);
      }
    }
  }
});
