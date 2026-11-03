// The service worker registers in production builds only:
//   pnpm build && pnpm start, then PROD=1 pnpm exec playwright test offline
import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

test.skip(!process.env.PROD, "Needs a production build (set PROD=1)");

test("installable, and Today reads offline", async ({ page, context }) => {
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const icon = await page.request.get("/icons/512");
  expect(icon.headers()["content-type"]).toBe("image/png");

  await signInAsDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The first visit installs the worker; this one goes through it.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const kcal = await page.getByText("kcal remaining").textContent();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText("You are offline.")).toBeVisible();
  expect(await page.getByText("kcal remaining").textContent()).toBe(kcal);

  // Pages that are not saved explain themselves instead of failing.
  await page.goto("/recipes").catch(() => {});
  await expect(page.getByText("You are offline")).toBeVisible();
  await context.setOffline(false);
});
