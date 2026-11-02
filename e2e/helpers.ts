import { expect, type Page } from "@playwright/test";

/** Sign in through the one-click demo button. */
export async function signInAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Try the demo account" }).click();
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** Open the Quick Log palette the way a user on this device would. */
export async function openQuickLog(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole("button", { name: "Log food" }).click();
  } else {
    await page.keyboard.press("Control+k");
  }
  await expect(page.getByPlaceholder(/Search foods/)).toBeVisible();
}
