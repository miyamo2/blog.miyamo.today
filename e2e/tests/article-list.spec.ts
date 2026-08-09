import { expect, test } from "../fixtures/test";

// scripts/e2e.mjs builds with ARTICLE_PER_PAGE=2 over the mock's 4 articles
const PER_PAGE = 2;

test.describe("article list page (/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders one page worth of article cards", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Articles" })).toBeVisible();
    await expect(page.locator(".article-card")).toHaveCount(PER_PAGE);
  });

  test("each card carries a title link, tags, an excerpt and a date", async ({ page }) => {
    const card = page.locator(".article-card").first();

    const titleLink = card.locator("a.article-card-link");
    const title = (await titleLink.innerText()).trim();
    expect(title).not.toEqual("");
    await expect(titleLink).toHaveAttribute("href", /^\/articles\/.+/);
    await expect(titleLink).toHaveAttribute("aria-label", `link: ${title}`);

    const tagLinks = card.locator(".article-card-tags a");
    expect(await tagLinks.count()).toBeGreaterThan(0);
    await expect(tagLinks.first()).toHaveAttribute("href", /^\/tags\/.+/);

    // format(createdAt, "YYYY/MM/DD")
    await expect(card).toContainText(/\d{4}\/\d{2}\/\d{2}/);
    await expect(card.locator("p.text-muted-foreground")).not.toBeEmpty();
  });

  test("every thumbnail that can sit above the fold is eager, and only the LCP candidate is high priority", async ({
    page,
  }) => {
    // the grid is at most four columns wide, so the first four cards can share
    // the first screenful -- lazily loading any of them would hide whichever
    // one is the LCP element from the preload scanner
    const thumbnails = page.locator(".article-card-thumbnail img[data-remote-image]");
    const count = await thumbnails.count();
    expect(count).toBeGreaterThan(1);

    await expect(thumbnails.first()).toHaveAttribute("loading", "eager");
    await expect(thumbnails.first()).toHaveAttribute("fetchpriority", "high");

    for (let i = 1; i < Math.min(count, 4); i++) {
      await expect(thumbnails.nth(i)).toHaveAttribute("loading", "eager");
      await expect(thumbnails.nth(i)).not.toHaveAttribute("fetchpriority", "high");
    }
  });

  test("thumbnails actually decode", async ({ page }) => {
    const thumbnail = page.locator(".article-card-thumbnail img[data-remote-image]").first();
    await expect(thumbnail).toBeVisible();
    const width = await thumbnail.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(width).toBeGreaterThan(0);
  });

  test("the title link opens the article", async ({ page }) => {
    const titleLink = page.locator("a.article-card-link").first();
    const href = await titleLink.getAttribute("href");
    await titleLink.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator("main article .markdown-body")).toBeVisible();
  });

  test("a card's tag link opens that tag's list", async ({ page }) => {
    const tagLink = page.locator(".article-card-tags a").first();
    const label = (await tagLink.innerText()).trim();
    await tagLink.click();
    await expect(page).toHaveURL(/\/tags\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(label);
  });
});
