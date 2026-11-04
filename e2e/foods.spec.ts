// The Foods tab: the hub, My foods, and saved meals from building one to
// logging it. Each test cleans up so the demo account stays as seeded.
import { expect, type Page, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

async function today(page: Page): Promise<string> {
  const { date } = (await (
    await page.request.get("/api/summary/day")
  ).json()) as { date: string };
  return date;
}

async function foodId(page: Page, q: string): Promise<number> {
  const { results } = (await (
    await page.request.get(`/api/foods/search?q=${encodeURIComponent(q)}`)
  ).json()) as { results: { id: number }[] };
  return results[0]!.id;
}

async function logFood(page: Page, id: number, slot = "snack") {
  const res = await page.request.post("/api/diary", {
    data: {
      date: await today(page),
      mealSlot: slot,
      item: { kind: "food", foodId: id, quantityG: 120 },
    },
  });
  return ((await res.json()) as { id: number }).id;
}

/** A saved meal's card on the meals page (toasts are list items too). */
function mealCard(page: Page, name: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name }) });
}

/** Remove what a test logged today through a saved meal. */
async function deleteMealEntries(page: Page) {
  const day = (await (
    await page.request.get(`/api/diary?date=${await today(page)}`)
  ).json()) as {
    slots: Record<string, { id: number; loggedVia: string }[]>;
  };
  for (const entry of Object.values(day.slots).flat()) {
    if (entry.loggedVia === "meal") {
      await page.request.delete(`/api/diary/${entry.id}`);
    }
  }
}

test("the Foods tab links to every part of the library", async ({ page }) => {
  await signInAsDemo(page);
  await page.getByRole("link", { name: "Foods", exact: true }).first().click();
  await expect(page).toHaveURL(/\/foods$/);
  await expect(
    page.getByRole("heading", { name: "Foods", level: 1 }),
  ).toBeVisible();
  for (const name of ["My foods", "Saved meals", "Recipes", "Custom foods"]) {
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /Create meal/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Create recipe/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create food/ })).toBeVisible();
});

test("My foods lists what was logged and logs it again", async ({ page }) => {
  await signInAsDemo(page);
  const banana = await foodId(page, "banana raw");
  const first = await logFood(page, banana);
  let second: number | undefined;
  try {
    await page.goto("/foods/mine");
    await page.getByLabel("Search my foods").fill("banana");
    const row = page.getByRole("button", { name: /^Log Bananas?, raw/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText(/Logged (once|\d+ times), last today/);

    await row.click();
    const amount = page.getByLabel("Amount");
    await expect(amount).toBeVisible();
    await page.getByRole("button", { name: /^Log to / }).click();
    await expect(page.getByText(/^Logged to /)).toBeVisible();

    const day = (await (
      await page.request.get(`/api/diary?date=${await today(page)}`)
    ).json()) as { slots: Record<string, { id: number; foodId: number }[]> };
    second = Object.values(day.slots)
      .flat()
      .filter((e) => e.foodId === banana && e.id !== first)
      .at(-1)?.id;
    expect(second).toBeDefined();
  } finally {
    await page.request.delete(`/api/diary/${first}`);
    if (second) await page.request.delete(`/api/diary/${second}`);
  }
});

test("build a saved meal, log it, then delete it", async ({ page }) => {
  await signInAsDemo(page);
  const name = `Test meal ${Date.now()}`;
  try {
    await page.goto("/foods/meals/new");
    await page.getByLabel("Name").fill(name);

    await page.getByRole("button", { name: "Add food" }).click();
    await page.getByPlaceholder("Search USDA foods").fill("banana raw");
    await page
      .getByRole("option", { name: /Bananas?, raw/ })
      .first()
      .click();
    const amount = page.getByLabel(/^Amount of Bananas?, raw/);
    await expect(amount).toBeVisible();
    await page.getByLabel(/^Unit for Bananas?, raw/).selectOption("g");
    await amount.fill("150");

    await page.getByRole("button", { name: "Add recipe" }).click();
    await page.getByRole("option").first().click();
    await expect(page.getByText("2 items")).toBeVisible();

    await page.getByRole("button", { name: "Create meal" }).click();
    await expect(page).toHaveURL(/\/foods\/meals$/);
    const card = mealCard(page, name);
    await expect(card).toContainText("150 g");
    await expect(card).toContainText("1 serving");

    // Log it from Quick Log's search, as a user would.
    await page.getByRole("button", { name: `Log ${name}` }).click();
    await page.getByRole("dialog").getByText("Snacks", { exact: true }).click();
    await page.getByRole("button", { name: "Log meal to snacks" }).click();
    await expect(page.getByText(`${name}: 2 items`)).toBeVisible();

    await page.goto("/today");
    const snacks = page.getByRole("region", { name: "Snacks" });
    await expect(
      snacks.getByRole("button", { name: /Bananas?, raw/ }).last(),
    ).toContainText("150 g");

    // Delete the meal from its edit page.
    await page.goto("/foods/meals");
    await page.getByRole("link", { name: `Edit ${name}` }).click();
    await page.getByRole("button", { name: "Delete meal" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/foods\/meals$/);
    await expect(page.getByText(name)).toHaveCount(0);
  } finally {
    await deleteMealEntries(page);
    const meals = (await (await page.request.get("/api/meals")).json()) as {
      id: string;
      name: string;
    }[];
    for (const m of meals.filter((m) => m.name === name)) {
      await page.request.delete(`/api/meals/${m.id}`);
    }
  }
});

test("save a logged slot as a meal", async ({ page }) => {
  await signInAsDemo(page);
  const entry = await logFood(page, await foodId(page, "banana raw"), "snack");
  const name = `Snack meal ${Date.now()}`;
  try {
    await page.goto("/today");
    await page
      .getByRole("region", { name: "Snacks" })
      .getByRole("link", { name: "Save as meal" })
      .click();
    await expect(page).toHaveURL(/\/foods\/meals\/new\?date=.*&slot=snack/);
    await expect(page.getByLabel(/^Amount of Bananas?, raw/)).toBeVisible();
    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Create meal" }).click();
    await expect(mealCard(page, name)).toContainText(/Bananas?, raw/);
  } finally {
    await page.request.delete(`/api/diary/${entry}`);
    const meals = (await (await page.request.get("/api/meals")).json()) as {
      id: string;
      name: string;
    }[];
    for (const m of meals.filter((m) => m.name === name)) {
      await page.request.delete(`/api/meals/${m.id}`);
    }
  }
});
