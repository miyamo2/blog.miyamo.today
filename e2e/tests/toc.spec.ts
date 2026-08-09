import { expect, test } from "../fixtures/test";

test.describe("table of contents", () => {
  test.beforeEach(async ({ page, articleIds }) => {
    await page.goto(`/articles/${articleIds[0]}`);
  });

  test("the sidebar lists every heading in the body @desktop", async ({ page }) => {
    const toc = page.locator(".side-toc");
    await expect(toc).toBeVisible();

    const tocHrefs = await toc.locator('a[href^="#"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? "")
    );
    expect(tocHrefs.length).toBeGreaterThan(0);

    const headingIds = await page
      .locator("article .markdown-body :is(h1,h2,h3,h4,h5,h6)[id]")
      .evaluateAll((headings) => headings.map((heading) => `#${heading.id}`));

    // every entry points at a heading that exists on the page
    for (const href of tocHrefs) {
      expect(headingIds).toContain(decodeURIComponent(href));
    }
  });

  test("clicking an entry scrolls to the heading and updates the hash @desktop", async ({
    page,
  }) => {
    const entry = page.locator('.side-toc a[href^="#"]').nth(1);
    const href = (await entry.getAttribute("href")) ?? "";

    await entry.click();
    // the hash is written with history.replaceState; the browser percent-encodes
    // the japanese heading ids on the way into location.href
    await expect.poll(() => decodeURIComponent(page.url())).toContain(href);

    const id = decodeURIComponent(href.slice(1));
    // smooth scrolling, so wait for the heading to settle inside the viewport
    await expect(page.locator(`[id="${id}"]`)).toBeInViewport({ timeout: 10_000 });
  });

  test("the floating button opens the modal @mobile", async ({ page }) => {
    const trigger = page.locator('button[aria-label="table-of-contents-button"]');
    await expect(trigger).toBeVisible();

    await trigger.click();
    const dialog = page.locator("#toc-modal dialog");
    await expect(dialog).toHaveAttribute("data-state", "open");
    await expect(page.getByRole("heading", { name: "Table of Contents" })).toBeVisible();
    expect(await dialog.locator('a[href^="#"]').count()).toBeGreaterThan(0);
  });

  test("picking a heading in the modal closes it and jumps there @mobile", async ({ page }) => {
    await page.locator('button[aria-label="table-of-contents-button"]').click();
    const dialog = page.locator("#toc-modal dialog");
    await expect(dialog).toHaveAttribute("data-state", "open");

    const entry = dialog.locator('a[href^="#"]').nth(1);
    const href = (await entry.getAttribute("href")) ?? "";
    await entry.click();

    await expect(dialog).toHaveAttribute("data-state", "closed");
    await expect.poll(() => decodeURIComponent(page.url())).toContain(href);
    await expect(page.locator(`[id="${decodeURIComponent(href.slice(1))}"]`)).toBeInViewport({
      timeout: 10_000,
    });
  });

  test("the close button dismisses the modal @mobile", async ({ page }) => {
    await page.locator('button[aria-label="table-of-contents-button"]').click();
    const dialog = page.locator("#toc-modal dialog");
    await expect(dialog).toHaveAttribute("data-state", "open");

    await dialog.locator("button[data-dialog-close]").click();
    await expect(dialog).toHaveAttribute("data-state", "closed");
  });
});
