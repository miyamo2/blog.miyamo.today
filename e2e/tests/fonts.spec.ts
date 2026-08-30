import { expect, searchDialog, searchTrigger, test, type Locator } from "../fixtures/test";

/** `/fonts/UDEVGothic35HS-Regular-Subset.<digest>.woff2`, as BaseHead writes it */
const SUBSET_URL = /\/fonts\/UDEVGothic35HS-Regular-Subset\.[0-9a-f]{8}\.woff2/;
const FULL_URL = "/fonts/UDEVGothic35HS-Regular-Subset.woff2";

// nothing here changes with the viewport, so once is enough
test.describe("webfonts @desktop", () => {
  test("a page paints from the subset faces and never fetches the full ones", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const statuses = await page.evaluate(() => {
      const byFamily: Record<string, string[]> = {};
      for (const face of document.fonts) {
        (byFamily[face.family] ??= []).push(face.status);
      }
      return byFamily;
    });

    // the subset family is what the page renders with
    expect(statuses["UDEVGothicHS"]).toContain("loaded");
    // the complete faces are only the per-character fallback behind it, and a
    // page whose text the build already knew about must not reach for them
    expect(statuses["UDEVGothicHSFull"] ?? []).not.toContain("loaded");
  });

  test("opening search fetches the complete faces, before anything is typed", async ({ page }) => {
    // the search box is the one place a character the build never saw can turn
    // up, and asking for the face once it is on screen would be too late
    await page.goto("/");
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    await searchTrigger(page).click();
    await expect(searchDialog(page)).toHaveAttribute("data-state", "open");

    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.fonts]
            .filter((face) => face.family === "UDEVGothicHSFull")
            .map((face) => face.status)
        )
      )
      .toContain("loaded");
  });

  test("the subset is named after its contents, so /fonts can stay immutable", async ({ page }) => {
    await page.goto("/");
    // a subset's bytes change whenever the site's text does; the deploy serves
    // /fonts with a year of `immutable`, which only holds if the name changes too
    expect(await page.content()).toMatch(SUBSET_URL);
  });

  test("the subset is far smaller than the face it came from", async ({ page }) => {
    await page.goto("/");
    const subsetUrl = (await page.content()).match(SUBSET_URL)?.[0] ?? "";

    const [subset, full] = await Promise.all([
      page.request.get(subsetUrl),
      page.request.get(FULL_URL),
    ]);
    expect(subset.ok()).toBe(true);
    expect(full.ok()).toBe(true);

    const subsetBytes = (await subset.body()).length;
    const fullBytes = (await full.body()).length;

    expect(subsetBytes).toBeGreaterThan(0);
    // the mock's four articles are small; the real corpus is bigger, but a
    // subset anywhere near the full face means the build stopped subsetting
    expect(subsetBytes).toBeLessThan(fullBytes / 2);
  });
});

/**
 * UDEVGothic advances every halfwidth glyph at 0.599em -- U+0020 with the rest,
 * since it is a coding face and this is its roomy "35" cut. Prose that mixes
 * japanese with latin words is mostly halfwidth spaces at the joins, so
 * styles/global.css pulls them back to roughly a proportional font's gap and
 * leaves them alone wherever a space is alignment rather than a word break.
 */
test.describe("halfwidth spacing @desktop", () => {
  /** word-spacing as a fraction of the element's own font-size */
  const spaceRatio = (locator: Locator): Promise<number> =>
    locator.evaluate((el) => {
      const style = getComputedStyle(el);
      return (parseFloat(style.wordSpacing) || 0) / parseFloat(style.fontSize);
    });

  test("prose narrows the coding face's space, at every text size", async ({
    page,
    articleIds,
  }) => {
    await page.goto(`/articles/${articleIds[0]}`);
    const body = page.locator("article .markdown-body");

    // the declaration is in `em`, so a 2em heading is pulled back by twice the
    // pixels of a 16px paragraph and reads the same
    expect(await spaceRatio(body.locator("p").first())).toBeCloseTo(-0.25, 2);
    expect(await spaceRatio(body.locator("h2").first())).toBeCloseTo(-0.25, 2);
    expect(await spaceRatio(page.getByRole("heading", { level: 1 }))).toBeCloseTo(-0.25, 2);
  });

  test("code keeps it, so listings stay on the monospace grid", async ({ page, articleIds }) => {
    await page.goto(`/articles/${articleIds[0]}`);
    const body = page.locator("article .markdown-body");

    expect(await spaceRatio(body.locator("pre").first())).toBe(0);
    expect(await spaceRatio(body.locator("p code").first())).toBe(0);
    // shiki gives every token its own span, and the `*` that carries the prose
    // value reaches those too -- the exception has to take them back
    expect(await spaceRatio(body.locator("pre code span").first())).toBe(0);
  });
});
