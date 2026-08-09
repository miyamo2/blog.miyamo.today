import { expect, test } from "../fixtures/test";

/**
 * The mock serves 4 articles and the e2e build sets ARTICLE_PER_PAGE=2, so the
 * article list is exactly two pages: enough for every branch of Pager.astro
 * (first/prev/next/last, the active page, the disabled edges) without the
 * ellipsis, which only appears past 7 pages.
 */
const LAST_PAGE = 2;

test.describe("pagination", () => {
  test("page 1 disables the backward controls and enables the forward ones", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByLabel("Go to first page")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByLabel("Go to previous page")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByLabel("Go to page 1")).toHaveAttribute("aria-current", "page");
    await expect(page.getByLabel("Go to next page")).toHaveAttribute("href", `/pages/2`);
    await expect(page.getByLabel("Go to last page")).toHaveAttribute("href", `/pages/${LAST_PAGE}`);
  });

  test("the next link walks to /pages/2, which shows different articles", async ({ page }) => {
    await page.goto("/");
    const firstPageTitles = await page.locator("a.article-card-link").allInnerTexts();

    await page.getByLabel("Go to next page").click();
    await expect(page).toHaveURL(/\/pages\/2$/);

    const secondPageTitles = await page.locator("a.article-card-link").allInnerTexts();
    expect(secondPageTitles).not.toEqual(firstPageTitles);
    expect(secondPageTitles.length).toBeGreaterThan(0);
  });

  test("the last page disables the forward controls", async ({ page }) => {
    await page.goto(`/pages/${LAST_PAGE}`);

    await expect(page.getByLabel(`Go to page ${LAST_PAGE}`)).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(page.getByLabel("Go to next page")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByLabel("Go to last page")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByLabel("Go to first page")).toHaveAttribute("href", "/");
  });

  test("a numbered link goes straight to that page", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(`Go to page ${LAST_PAGE}`).click();
    await expect(page).toHaveURL(new RegExp(`/pages/${LAST_PAGE}$`));
  });

  test("/pages/1 redirects to /", async ({ page }) => {
    await page.goto("/pages/1");
    // static output: Astro emits a meta-refresh page for the 301
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { level: 1, name: "Articles" })).toBeVisible();
  });
});
