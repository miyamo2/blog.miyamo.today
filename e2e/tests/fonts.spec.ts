import { expect, searchDialog, searchTrigger, test } from "../fixtures/test";

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
