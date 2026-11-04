// Camera barcode scanning on a phone. Chromium can replace the camera with
// a video file, so the test draws a real EAN-13 into a short Y4M clip and
// the scanner has to read it from the live stream like a real camera.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { openQuickLog, signInAsDemo } from "./helpers";

const CODE = "3017620422003"; // Nutella, as in log-food.spec.ts
const W = 640;
const H = 480;

// EAN-13 digit patterns: L and G codes for the left half (G is the
// reversed R code), R codes for the right, and the first digit picks the
// L/G parity of the other six on the left.
const R = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];
const L = R.map((r) => [...r].map((b) => (b === "1" ? "0" : "1")).join(""));
const G = R.map((r) => [...r].reverse().join(""));
const PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

function ean13Modules(code: string): string {
  const d = [...code].map(Number);
  const parity = PARITY[d[0]!]!;
  const left = d
    .slice(1, 7)
    .map((n, i) => (parity[i] === "L" ? L : G)[n])
    .join("");
  const right = d
    .slice(7)
    .map((n) => R[n])
    .join("");
  return `101${left}01010${right}101`;
}

/** A few seconds of the barcode on white, as 4:2:0 Y4M frames. */
function barcodeClip(path: string) {
  const modules = ean13Modules(CODE);
  const scale = 5; // pixels per module
  const barW = modules.length * scale;
  const barH = 200;
  const luma = Buffer.alloc(W * H, 235);
  const left = Math.floor((W - barW) / 2);
  const top = Math.floor((H - barH) / 2);
  for (let y = 0; y < barH; y++) {
    for (let x = 0; x < barW; x++) {
      if (modules[Math.floor(x / scale)] === "1") {
        luma[(top + y) * W + left + x] = 16;
      }
    }
  }
  const chroma = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), luma, chroma]);
  const header = Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`);
  writeFileSync(path, Buffer.concat([header, ...Array(30).fill(frame)]));
}

const dir = join("test-results", "fixtures");
mkdirSync(dir, { recursive: true });
const clip = join(dir, "barcode.y4m");
barcodeClip(clip);

test.use({
  permissions: ["camera"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${clip}`,
    ],
  },
});

test("scan a barcode with the camera and log it", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Phones open the camera; desktop types digits");
  await signInAsDemo(page);
  await openQuickLog(page, isMobile);
  await page.getByRole("button", { name: "Scan a barcode" }).click();

  // The viewfinder opens without another tap, reads the code, looks it up.
  await expect(page.getByLabel("Camera viewfinder")).toBeVisible();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Nutella", { exact: true })).toBeVisible({
    timeout: 20_000,
  });

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

test("a blocked camera falls back to typing", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Phones open the camera; desktop types digits");
  await signInAsDemo(page);
  await page.context().clearPermissions();
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("blocked", "NotAllowedError"));
  });
  await page.reload();
  await openQuickLog(page, isMobile);
  await page.getByRole("button", { name: "Scan a barcode" }).click();
  await expect(page.getByText(/Camera access is blocked/)).toBeVisible();
  await expect(page.getByLabel("Digits under the barcode")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Scan with camera" }),
  ).toBeVisible();
});
