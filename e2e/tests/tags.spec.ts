import { expect, test, type Page } from "../fixtures/test";

const PER_PAGE = 2;

interface TagEntry {
  href: string;
  name: string;
  count: number;
}

/** reads the tag list off /tags rather than restating what the mock serves */
const readTags = async (page: Page): Promise<TagEntry[]> => {
  const badges = page.locator('main a[href^="/tags/"]');
  const entries: TagEntry[] = [];
  for (const badge of await badges.all()) {
    const href = (await badge.getAttribute("href")) ?? "";
    const text = (await badge.innerText()).trim();
    const match = /^#(.+)\((\d+)\)$/.exec(text);
    if (!match) continue;
    entries.push({ href, name: match[1], count: Number(match[2]) });
  }
  return entries;
};

test.describe("tags page (/tags)", () => {
  test("lists every tag with its article count", async ({ page }) => {
    await page.goto("/tags");
    await expect(page.getByRole("heading", { level: 1, name: "Tags" })).toBeVisible();

    const tags = await readTags(page);
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag.count).toBeGreaterThan(0);
      expect(tag.href).toMatch(/^\/tags\/[^/]+$/);
    }
  });

  test("a tag opens its article list", async ({ page }) => {
    await page.goto("/tags");
    const [first] = await readTags(page);

    await page.locator(`main a[href="${first.href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${first.href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`#${first.name}`);
    await expect(page.locator(".article-card")).toHaveCount(Math.min(first.count, PER_PAGE));
  });
});

test.describe("tagged article list", () => {
  test("a tag with more articles than fit on a page is paginated", async ({ page }) => {
    await page.goto("/tags");
    const paginated = (await readTags(page)).find((tag) => tag.count > PER_PAGE);
    test.skip(!paginated, "no tag has more than one page of articles");

    await page.goto(paginated!.href);
    const firstPageTitles = await page.locator("a.article-card-link").allInnerTexts();

    await page.getByLabel("Go to next page").click();
    await expect(page).toHaveURL(new RegExp(`${paginated!.href}/2$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`#${paginated!.name}`);
    expect(await page.locator("a.article-card-link").allInnerTexts()).not.toEqual(firstPageTitles);
  });

  test("page 1 of a tag redirects to the tag's own path", async ({ page }) => {
    await page.goto("/tags");
    const paginated = (await readTags(page)).find((tag) => tag.count > PER_PAGE);
    test.skip(!paginated, "no tag has more than one page of articles");

    await page.goto(`${paginated!.href}/1`);
    await page.waitForURL((url) => url.pathname === paginated!.href);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`#${paginated!.name}`);
  });

  test("a tag that fits on one page shows no pager", async ({ page }) => {
    await page.goto("/tags");
    const single = (await readTags(page)).find((tag) => tag.count <= PER_PAGE);
    test.skip(!single, "every tag spans more than one page");

    await page.goto(single!.href);
    await expect(page.locator("main").getByLabel("Go to next page")).toHaveCount(0);
  });
});
