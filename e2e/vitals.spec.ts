// Core Web Vitals on Today against a production build, with 4x CPU
// throttling on the mobile project:
//   pnpm build && pnpm start, then PROD=1 pnpm exec playwright test vitals
import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

test.skip(!process.env.PROD, "Needs a production build (set PROD=1)");

test("Today: LCP under 2 s, CLS under 0.05", async ({ page, isMobile }) => {
  await signInAsDemo(page);
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  await page.addInitScript(() => {
    const w = window as unknown as { __lcp: number; __cls: number };
    w.__lcp = 0;
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!e.hadRecentInput) w.__cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  // Warm the server once, then measure a fresh load.
  await page.goto("/today");
  await page.goto("/today");
  await expect(page.getByText("kcal remaining")).toBeVisible();
  await page.waitForTimeout(1500);
  const { lcp, cls } = await page.evaluate(() => {
    const w = window as unknown as { __lcp: number; __cls: number };
    return { lcp: w.__lcp, cls: w.__cls };
  });
  console.log(`LCP ${Math.round(lcp)} ms, CLS ${cls.toFixed(3)}`);
  expect(lcp).toBeLessThan(2000);
  expect(cls).toBeLessThan(0.05);
});
