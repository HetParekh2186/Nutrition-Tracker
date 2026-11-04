import { expect, test } from "@playwright/test";

// Email and password sign-in, next to magic links. Uses the demo account's
// real credentials from .env.local, so it runs against Supabase Auth.
try {
  process.loadEnvFile(".env.local");
} catch {
  // CI sets the variables directly.
}
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;

test("signs in with email and password", async ({ page }) => {
  test.skip(!email || !password, "needs DEMO_EMAIL and DEMO_PASSWORD");
  await page.goto("/login?next=/settings");
  await page.getByRole("textbox", { name: "Email" }).fill(email!);
  await page.locator('input[name="password"]').fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // `next` is honoured.
  await expect(page).toHaveURL(/\/settings/, { timeout: 20_000 });
  // The shared demo account cannot change its password.
  await expect(page.getByRole("heading", { name: "Password" })).toHaveCount(0);
});

test("a wrong password says so without saying which part", async ({ page }) => {
  test.skip(!email, "needs DEMO_EMAIL");
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email!);
  await page.locator('input[name="password"]').fill("not the password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/email and password do not match/)).toBeVisible();
});

test("switches between password, sign-up, reset and email link", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("someone@example.com");

  await page.getByRole("button", { name: "Create an account" }).click();
  // The email carries over between modes.
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(
    "someone@example.com",
  );
  await expect(page.getByText(/At least 8 characters/)).toBeVisible();

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("button", { name: "Email me a reset link" }),
  ).toBeVisible();

  await page.getByText("Email link", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Email me a sign-in link" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(
    "someone@example.com",
  );
});

test("the password can be shown and hidden", async ({ page }) => {
  await page.goto("/login");
  const field = page.locator('input[name="password"]');
  await field.fill("secret phrase");
  await expect(field).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(field).toHaveAttribute("type", "text");
});
