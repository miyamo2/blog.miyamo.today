import { expect, test, type Page } from "../fixtures/test";

const SITE_ORIGIN = "https://blog.miyamo.today";

const metaContent = (page: Page, selector: string): Promise<string | null> =>
  page.locator(selector).getAttribute("content");

/** every page emits one <script type="application/ld+json"> holding one @graph */
const jsonLdGraph = async (page: Page): Promise<Record<string, unknown>[]> => {
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const parsed = JSON.parse((await scripts.textContent()) ?? "{}");
  expect(parsed["@context"]).toContain("schema.org");
  expect(Array.isArray(parsed["@graph"])).toBe(true);
  return parsed["@graph"];
};

const typesOf = (graph: Record<string, unknown>[]): string[] =>
  graph.flatMap((node) => {
    const type = node["@type"];
    return Array.isArray(type) ? (type as string[]) : [type as string];
  });

test.describe("head metadata @desktop", () => {
  for (const [path, title] of [
    ["/", "Articles | blog.miyamo.today"],
    ["/tags", "Tags | blog.miyamo.today"],
    ["/about", "About | blog.miyamo.today"],
  ] as const) {
    test(`${path} carries its title, canonical and open graph tags`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveTitle(title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        /.+/
      );

      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toBeTruthy();
      const canonicalUrl = new URL(canonical!);
      expect(canonicalUrl.origin).toBe(SITE_ORIGIN);
      expect(canonicalUrl.pathname.replace(/\/$/, "")).toBe(path.replace(/\/$/, ""));

      expect(await metaContent(page, 'meta[property="og:title"]')).toBe(title);
      expect(await metaContent(page, 'meta[property="og:url"]')).toBe(canonical);
      expect(await metaContent(page, 'meta[property="og:image"]')).toMatch(
        new RegExp(`^${SITE_ORIGIN}/`)
      );
      expect(await metaContent(page, 'meta[name="twitter:card"]')).toBe("summary_large_image");
      expect(await metaContent(page, 'meta[name="twitter:creator"]')).toBe("@miyamo2_jp");
      expect(await metaContent(page, 'meta[property="fb:app_id"]')).toBe("000000000000000");
    });
  }

  test("an article page describes itself as an article", async ({ page, articleIds }) => {
    await page.goto(`/articles/${articleIds[0]}`);

    const heading = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
    await expect(page).toHaveTitle(`${heading} | blog.miyamo.today`);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBe(`${SITE_ORIGIN}/articles/${articleIds[0]}`);

    const graph = await jsonLdGraph(page);
    expect(typesOf(graph).join(" ")).toMatch(/Article|BlogPosting/);
    expect(typesOf(graph)).toContain("BreadcrumbList");
  });

  test("the article list is a CollectionPage and a Blog", async ({ page }) => {
    await page.goto("/");
    const types = typesOf(await jsonLdGraph(page));
    expect(types).toContain("CollectionPage");
    expect(types).toContain("Blog");
    expect(types).toContain("WebSite");
    expect(types).toContain("Person");
  });

  test("the about page is a ProfilePage", async ({ page }) => {
    await page.goto("/about");
    expect(typesOf(await jsonLdGraph(page))).toContain("ProfilePage");
  });

  test("the search panel's url variant still points home", async ({ page }) => {
    await page.goto("/?q=whatever");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical!).search).toBe("");
  });

  test("the fonts the pages preload are actually served", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page
      .locator('link[rel="preload"][as="font"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      const response = await request.get(href);
      expect(response.status(), `${href} should be served`).toBe(200);
    }
  });
});
