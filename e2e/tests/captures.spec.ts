import { mockAlgolia } from "../fixtures/algolia";
import { expect, searchDialog, searchTrigger, test, themeToggle, type Page } from "../fixtures/test";

/**
 * The capture sweep.
 *
 * Every other spec asserts behaviour; this one exists to leave a picture of each
 * screen behind. The files land in e2e/captures/<project>/<name>.png and are
 * attached to the HTML report, so a CI run ships a full visual record of the
 * build without anyone having to reproduce it locally.
 *
 * Both viewports are covered because both projects run this file.
 */

const inDark = async (page: Page): Promise<void> => {
  await themeToggle(page).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
};

interface Screen {
  name: string;
  /** brings the page to the state worth photographing */
  open: (page: Page, articleIds: string[]) => Promise<unknown>;
  ready: (page: Page) => Promise<unknown>;
}

const SCREENS: Screen[] = [
  {
    name: "article-list",
    open: (page) => page.goto("/"),
    ready: (page) => expect(page.locator(".article-card").first()).toBeVisible(),
  },
  {
    name: "article-list-page-2",
    open: (page) => page.goto("/pages/2"),
    ready: (page) => expect(page.locator(".article-card").first()).toBeVisible(),
  },
  {
    name: "tags",
    open: (page) => page.goto("/tags"),
    ready: (page) => expect(page.getByRole("heading", { level: 1, name: "Tags" })).toBeVisible(),
  },
  {
    name: "tagged-articles",
    // reached through the tag list, so the tag's id never has to be restated here
    open: async (page) => {
      await page.goto("/tags");
      await page.locator('main a[href^="/tags/"]').first().click();
      await page.waitForURL((url) => /^\/tags\/[^/]+$/.test(url.pathname));
    },
    ready: (page) => expect(page.locator(".article-card").first()).toBeVisible(),
  },
  {
    name: "article-detail",
    open: (page, articleIds) => page.goto(`/articles/${articleIds[0]}`),
    ready: (page) => expect(page.locator("article .markdown-body")).toBeVisible(),
  },
  {
    name: "about",
    open: (page) => page.goto("/about"),
    ready: (page) => expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible(),
  },
  {
    name: "not-found",
    open: (page) => page.goto("/this-path-does-not-exist"),
    ready: (page) =>
      expect(page.getByRole("heading", { level: 1, name: "Page Not Found" })).toBeVisible(),
  },
];

test.describe("captures", () => {
  for (const screen of SCREENS) {
    test(`${screen.name} in both themes`, async ({ page, articleIds, capture }) => {
      await screen.open(page, articleIds);
      await screen.ready(page);
      await capture(`${screen.name}-light`);

      await inDark(page);
      await screen.ready(page);
      await capture(`${screen.name}-dark`);
    });
  }

  test("search panel with results", async ({ page, capture }) => {
    await mockAlgolia(page);
    await page.goto("/");

    await searchTrigger(page).click();
    const dialog = searchDialog(page);
    await expect(dialog).toHaveAttribute("data-state", "open");
    await dialog.locator("[data-search-input]").fill("検索結果");
    await expect(dialog.locator(".index-hit-card").first()).toBeVisible();

    await capture("search-results-light");
  });

  test("mobile menu @mobile", async ({ page, capture }) => {
    await page.goto("/");
    await page.locator('button[aria-label="menu-button"]').click();
    await expect(page.locator("#menu-modal dialog")).toHaveAttribute("data-state", "open");
    await capture("menu-modal", { fullPage: false });
  });

  test("table of contents modal @mobile", async ({ page, articleIds, capture }) => {
    await page.goto(`/articles/${articleIds[0]}`);
    await page.locator('button[aria-label="table-of-contents-button"]').click();
    await expect(page.locator("#toc-modal dialog")).toHaveAttribute("data-state", "open");
    await capture("toc-modal", { fullPage: false });
  });

  test("article sidebar @desktop", async ({ page, articleIds, capture }) => {
    await page.goto(`/articles/${articleIds[0]}`);
    await expect(page.locator(".side-toc")).toBeVisible();
    await capture("article-sidebar", { clip: page.locator(".article-sidebar").first() });
  });
});
