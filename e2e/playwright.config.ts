import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
// scripts/e2e.mjs passes this; the fallback keeps a bare `playwright test` working
const SITE_ROOT = process.env.E2E_ROOT ?? resolve(E2E_DIR, "..");

const PORT = process.env.E2E_PORT ?? "4321";
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  // traces, videos and failure screenshots; the deliberate captures go to captures/
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // the site is Japanese and formats dates in JST; pin both so a rendered
    // date is the same string on a developer's machine and on a CI runner
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    // the theme script falls back to prefers-color-scheme when localStorage is
    // empty, so every test starts in light mode unless it says otherwise
    colorScheme: "light",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        // >= lg: the desktop header, the side TOC and the share rail are all
        // rendered above this width
        viewport: { width: 1440, height: 900 },
      },
      // the mobile-only surfaces (hamburger menu, TOC fab) are not rendered here
      grepInvert: /@mobile/,
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
      // layout-specific desktop assertions do not hold on a 412px viewport
      grepInvert: /@desktop/,
    },
  ],
  webServer: {
    // the suite runs against the built site, never against `astro dev`
    command: `bunx astro preview --host 127.0.0.1 --port ${PORT}`,
    cwd: SITE_ROOT,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
