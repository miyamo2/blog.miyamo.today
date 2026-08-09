import { EMPTY_QUERY, MOCK_HITS, mockAlgolia } from "../fixtures/algolia";
import { expect, searchDialog, searchTrigger, test, type Page } from "../fixtures/test";

const QUERY = "Astro";

const openPanel = async (page: Page) => {
  await searchTrigger(page).click();
  const dialog = searchDialog(page);
  await expect(dialog).toHaveAttribute("data-state", "open");
  return dialog;
};

test.describe("search panel", () => {
  test("opens from the header and focuses the input", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto("/");

    const dialog = await openPanel(page);
    const input = dialog.locator("[data-search-input]");
    await expect(input).toBeFocused();
    await expect(dialog.locator("[data-search-results]")).toBeHidden();
  });

  test("a query renders hits, the count and the pager", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto("/");
    const dialog = await openPanel(page);

    await dialog.locator("[data-search-input]").fill(QUERY);

    await expect(dialog.locator("[data-search-count]")).toHaveText(`${MOCK_HITS.length} results`);
    await expect(dialog.locator(".index-hit-card")).toHaveCount(5);
    await expect(dialog.locator("[data-search-pager]")).toBeVisible();

    const firstCard = dialog.locator(".index-hit-card").first();
    await expect(firstCard).toHaveAttribute("href", `/articles/${MOCK_HITS[0].objectID}`);
    await expect(firstCard).toHaveAttribute("aria-label", `link: ${MOCK_HITS[0].title}`);
    await expect(firstCard.locator(".hit-title")).toContainText(MOCK_HITS[0].title);
    await expect(firstCard.locator(".hit-tags")).toContainText(MOCK_HITS[0].tags.join(", "));
  });

  test("matches are highlighted", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto("/");
    const dialog = await openPanel(page);

    await dialog.locator("[data-search-input]").fill("検索結果");
    await expect(dialog.locator(".index-hit-card .hit-title mark").first()).toHaveText("検索結果");
  });

  test("keystrokes are debounced into a single request", async ({ page }) => {
    const queries = await mockAlgolia(page);
    await page.goto("/");
    const dialog = await openPanel(page);

    await dialog.locator("[data-search-input]").pressSequentially(QUERY, { delay: 30 });
    await expect(dialog.locator(".index-hit-card").first()).toBeVisible();

    expect(queries).toEqual([QUERY]);
  });

  test("the pager walks to the next page of hits", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto("/");
    const dialog = await openPanel(page);

    await dialog.locator("[data-search-input]").fill(QUERY);
    await expect(dialog.locator(".index-hit-card")).toHaveCount(5);

    await dialog.locator('[data-search-pager] button[aria-label="Go to page 2"]').click();

    await expect(
      dialog.locator('[data-search-pager] button[aria-label="Go to page 2"]')
    ).toHaveAttribute("aria-current", "page");
    await expect(dialog.locator(".index-hit-card").first()).toHaveAttribute(
      "href",
      `/articles/${MOCK_HITS[5].objectID}`
    );
    await expect(page).toHaveURL(/[?&]page=2/);
  });

  test("the query is written onto the url and restored from it", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto("/");
    const dialog = await openPanel(page);
    const entriesBefore = await page.evaluate(() => history.length);

    await dialog.locator("[data-search-input]").fill(QUERY);
    await expect(dialog.locator(".index-hit-card").first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]q=${QUERY}`));
    // the panel is a modal over the page it was opened from: the url is rewritten
    // with replaceState, so a search never buries the page under history entries
    expect(await page.evaluate(() => history.length)).toBe(entriesBefore);

    // a shared link opens the panel and re-runs the search on its own
    await page.goto(`/?q=${QUERY}`);
    const restored = searchDialog(page);
    await expect(restored).toHaveAttribute("data-state", "open");
    await expect(restored.locator("[data-search-input]")).toHaveValue(QUERY);
    await expect(restored.locator(".index-hit-card")).toHaveCount(5);
  });

  test("a deep link to page 2 restores that page", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto(`/?q=${QUERY}&page=2`);

    const dialog = searchDialog(page);
    await expect(dialog).toHaveAttribute("data-state", "open");
    await expect(dialog.locator(".index-hit-card").first()).toHaveAttribute(
      "href",
      `/articles/${MOCK_HITS[5].objectID}`
    );
  });

  test("clearing empties the results and the url", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto("/");
    const dialog = await openPanel(page);

    const input = dialog.locator("[data-search-input]");
    await input.fill(QUERY);
    await expect(dialog.locator(".index-hit-card").first()).toBeVisible();

    await dialog.locator("[data-search-clear]").click();
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await expect(dialog.locator("[data-search-results]")).toBeHidden();
    await expect(page).not.toHaveURL(/[?&]q=/);
  });

  test("closing the panel drops the search from the url", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto("/");
    const dialog = await openPanel(page);
    await dialog.locator("[data-search-input]").fill(QUERY);
    await expect(page).toHaveURL(/[?&]q=/);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveAttribute("data-state", "closed");
    await expect(page).not.toHaveURL(/[?&]q=/);
  });

  test("a query with no matches says so", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto("/");
    const dialog = await openPanel(page);

    await dialog.locator("[data-search-input]").fill(EMPTY_QUERY);
    await expect(dialog.locator("[data-search-status]")).toHaveText(
      "No articles matched your search."
    );
    await expect(dialog.locator(".index-hit-card")).toHaveCount(0);
  });

  test("a failing backend surfaces an error instead of an empty panel", async ({ page }) => {
    await mockAlgolia(page, { mode: "error" });
    await page.goto("/");
    const dialog = await openPanel(page);

    await dialog.locator("[data-search-input]").fill(QUERY);
    await expect(dialog.locator("[data-search-status]")).toHaveText(
      "Search failed. Please try again."
    );
  });

  test("a hit links to its article", async ({ page }) => {
    await mockAlgolia(page);
    await page.goto("/");
    const dialog = await openPanel(page);

    await dialog.locator("[data-search-input]").fill(QUERY);
    const hits = dialog.locator(".index-hit-card");
    await expect(hits.first()).toBeVisible();

    for (const [index, hit] of (await hits.all()).entries()) {
      await expect(hit).toHaveAttribute("href", `/articles/${MOCK_HITS[index].objectID}`);
    }
  });
});
