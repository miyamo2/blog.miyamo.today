import {
  test as base,
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const E2E_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Where the deliberate screenshots land. These are the run's artifacts -- kept
 * whether the run passed or failed -- as opposed to playwright's own
 * only-on-failure screenshots under test-results/.
 */
export const CAPTURE_DIR = process.env.E2E_CAPTURE_DIR
  ? resolve(process.env.E2E_CAPTURE_DIR)
  : join(E2E_DIR, "captures");

export interface CaptureOptions {
  /** default true: the whole scrollable page, not just the viewport */
  fullPage?: boolean;
  /** limit the shot to one element */
  clip?: Locator;
  /** extra hosts to keep animated; by default every animation is frozen */
  keepAnimations?: boolean;
}

export type Capture = (name: string, options?: CaptureOptions) => Promise<string>;

/** Hosts a page is allowed to reach. Everything else is aborted (see below). */
const isAllowedHost = (url: string, baseURL: string | undefined): boolean => {
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  try {
    const { hostname } = new URL(url);
    if (hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]") return true;
    if (baseURL && hostname === new URL(baseURL).hostname) return true;
    return false;
  } catch {
    return false;
  }
};

interface Fixtures {
  capture: Capture;
  /** ids of the articles the built site actually contains, newest first */
  articleIds: string[];
}

export const test = base.extend<Fixtures>({
  /**
   * Third-party requests are aborted for every test.
   *
   * The pages load the Buy Me a Coffee widget, giscus and remote fonts. None of
   * them is this site's behaviour, all of them are unreachable from a locked-down
   * CI runner, and letting them through makes captures depend on whatever a CDN
   * served that minute. Registered here first, so a test's own `page.route` (the
   * Algolia stand-in) still takes precedence.
   */
  page: async ({ page, baseURL }, use) => {
    await page.route("**/*", async (route) => {
      if (isAllowedHost(route.request().url(), baseURL)) {
        await route.fallback();
        return;
      }
      await route.abort();
    });
    await use(page);
  },

  capture: async ({ page }, use, testInfo) => {
    const taken = new Set<string>();

    const capture: Capture = async (name, options = {}) => {
      const { fullPage = true, clip, keepAnimations = false } = options;
      if (taken.has(name)) {
        throw new Error(`capture("${name}") was already taken in this test`);
      }
      taken.add(name);

      if (!keepAnimations) {
        // scroll-driven animations, the card hover transform and the caret all
        // move between two otherwise identical runs
        await page.addStyleTag({
          content: `*, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            caret-color: transparent !important;
          }`,
        });
      }
      await settle(page);

      const file = join(CAPTURE_DIR, testInfo.project.name, `${name}.png`);
      await mkdir(dirname(file), { recursive: true });
      const buffer = await (clip ?? page).screenshot(
        clip ? { animations: "disabled" } : { fullPage, animations: "disabled" }
      );
      await writeFile(file, buffer);
      // also lands in the HTML report, next to the test that took it
      await testInfo.attach(name, { body: buffer, contentType: "image/png" });
      return file;
    };

    await use(capture);
  },

  articleIds: async ({ playwright, baseURL }, use) => {
    await use(await loadArticleIds(playwright, baseURL));
  },
});

/**
 * The feed is the cheapest list of every article the build produced, and it is
 * in the same order as the article list page. Fetched once per worker process:
 * `baseURL` is a test-scoped option, so this cannot be a worker fixture, but the
 * result is the same for every test in the run.
 */
let articleIdsCache: Promise<string[]> | undefined;

const loadArticleIds = (
  playwright: { request: { newContext: (options: { baseURL?: string }) => Promise<APIRequestContext> } },
  baseURL: string | undefined
): Promise<string[]> =>
  (articleIdsCache ??= (async () => {
    const request = await playwright.request.newContext({ baseURL });
    try {
      const response = await request.get("/feed/rss.xml");
      const xml = await response.text();
      const ids = [...xml.matchAll(/<link>[^<]*\/articles\/([^<]+)<\/link>/g)].map(
        (match) => match[1]
      );
      if (ids.length === 0) {
        throw new Error("no articles found in /feed/rss.xml; did the build run against the mock?");
      }
      return ids;
    } finally {
      await request.dispose();
    }
  })());

/**
 * Waits for the things a screenshot depends on: the load event, webfonts, and
 * every <img> that is going to resolve.
 */
export const settle = async (page: Page): Promise<void> => {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images]
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            })
        )
    );
  });
};

/**
 * Narrows a locator to what is actually on screen.
 *
 * Several surfaces are rendered once per layout and hidden by breakpoint -- the
 * share rail and the recommendations both exist twice on an article page -- so a
 * plain selector matches copies a visitor cannot reach.
 *
 * The header is no longer one of them: it renders a single search box and a
 * single theme toggle for every width. The helpers below keep the filter anyway,
 * because a closed <dialog> is invisible too, which is what lets searchDialog()
 * describe the panel only while it is open.
 */
export const visible = (locator: Locator): Locator => locator.filter({ visible: true });

export const searchTrigger = (page: Page): Locator =>
  visible(page.locator('button[aria-label="search"]'));

export const searchDialog = (page: Page): Locator =>
  visible(page.locator('.algolia-search dialog[data-slot="dialog-content"]'));

export const themeToggle = (page: Page): Locator =>
  visible(page.locator('button[aria-label="toggle-dark-mode"]'));

export const currentTheme = (page: Page): Promise<"dark" | "light"> =>
  page.evaluate(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));

export { expect };
export type { APIRequestContext, Locator, Page } from "@playwright/test";
