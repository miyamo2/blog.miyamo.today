import { expect, test, visible } from "../fixtures/test";

test.describe("article detail page (/articles/[id])", () => {
  test.beforeEach(async ({ page, articleIds }) => {
    await page.goto(`/articles/${articleIds[0]}`);
  });

  test("shows the title, tags, publication date and hero image", async ({ page, articleIds }) => {
    const id = articleIds[0];

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    expect((await heading.innerText()).trim()).not.toEqual("");

    const tagLinks = page.locator('main a[href^="/tags/"]');
    expect(await tagLinks.count()).toBeGreaterThan(0);
    await expect(tagLinks.first()).toContainText("#");

    await expect(page.locator("main")).toContainText(/\d{4}\/\d{2}\/\d{2}/);

    const hero = page.locator(`img[alt="ArticleImage:${id}"]`).first();
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute("loading", "eager");
    expect(await hero.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    // the head preloads the hero, so its request does not wait for the parser
    // to walk past the rest of the head (see BaseHead's preloadImage)
    const preload = page.locator('head link[rel="preload"][as="image"]');
    await expect(preload).toHaveCount(1);
    await expect(preload).toHaveAttribute("imagesrcset", (await hero.getAttribute("srcset")) ?? "");
  });

  test("renders the whole markdown body", async ({ page }) => {
    const body = page.locator("article .markdown-body");
    await expect(body).toBeVisible();

    // headings (satteri's heading-ids gives every one an anchor target)
    const headings = body.locator("h2[id], h3[id]");
    expect(await headings.count()).toBeGreaterThan(0);

    // fenced code, with the copy affordance the plugin injects
    await expect(body.locator("pre").first()).toBeVisible();
    await expect(body.locator(".code-copy-button").first()).toHaveText("Copy");

    // table, raw html block and footnote all survive the pipeline
    await expect(body.locator("table")).toBeVisible();
    await expect(body.locator(".raw-html-test strong")).toHaveText("生HTMLブロック");
    await expect(body).toContainText("これは脚注です。");
  });

  test("body images are optimized and load", async ({ page }) => {
    const image = page.locator("article .markdown-body img").first();
    await expect(image).toBeVisible();
    expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test("a bare url becomes a link card", async ({ page }) => {
    // the mock serves /ogp-page with og: tags for satteri-link-card to read
    const card = page.locator('article .markdown-body a[href*="/ogp-page"]');
    await expect(card.first()).toBeVisible();
    await expect(card.first()).toContainText(/Mock OGP Page|ogp-page/);
  });

  // the button is `display: none` below 1200px (views/article-detail.css), so
  // the click only exists to be made at desktop widths
  test("the copy button copies the code block @desktop", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const body = page.locator("article .markdown-body");
    const button = body.locator(".code-copy-button").first();
    const code = (await body.locator("pre").first().innerText()).trim();

    await button.click();
    await expect(button).toHaveText("Copied!");
    await expect(button).toHaveClass(/copied/);

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard.trim()).toContain(code.split("\n")[0]);

    // the handler restores the label after 1.5s
    await expect(button).toHaveText("Copy", { timeout: 5_000 });
  });

  test("the copy button stays out of the way on a phone @mobile", async ({ page }) => {
    // it overlaps the code on a narrow screen, so it is hidden below 1200px --
    // the markup is still there, only the button is not shown
    const button = page.locator("article .markdown-body .code-copy-button").first();
    await expect(button).toHaveText("Copy");
    await expect(button).toBeHidden();
  });

  test("a tag on the article opens that tag's list", async ({ page }) => {
    const tagLink = page.locator('main a[href^="/tags/"]').first();
    const label = (await tagLink.innerText()).trim();
    await tagLink.click();
    await expect(page).toHaveURL(/\/tags\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(label);
  });

  test("the recommend block is rendered", async ({ page }) => {
    // the recommendations themselves need OpenAI + qdrant, which the e2e build
    // deliberately runs without; the block itself must still be there
    await expect(
      visible(page.getByRole("heading", { level: 2, name: "Recommend Articles" }))
    ).toBeVisible();
  });

  test("the giscus comment container mounts its loader", async ({ page }) => {
    const comments = page.locator("#comments");
    await expect(comments).toHaveAttribute("data-giscus-mounted", "true");
    // the request itself is blocked in e2e; the script element is what this owns
    await expect(comments.locator('script[src*="giscus.app"]')).toHaveCount(1);
  });
});

test.describe("share buttons", () => {
  test.beforeEach(async ({ page, articleIds }) => {
    await page.goto(`/articles/${articleIds[0]}`);
  });

  for (const network of ["Facebook", "X", "LinkedIn", "Reddit", "Hatena Bookmark", "LINE"]) {
    test(`links to ${network} with the article url`, async ({ page, articleIds }) => {
      const link = visible(page.locator(`main a[aria-label="Share on ${network}"]`)).first();
      await expect(link).toBeVisible();
      const href = (await link.getAttribute("href")) ?? "";
      expect(decodeURIComponent(href)).toContain(
        `https://blog.miyamo.today/articles/${articleIds[0]}`
      );
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  }

  test("the vertical rail also offers email @desktop", async ({ page, articleIds }) => {
    const link = visible(page.locator('main a[aria-label="Share by Email"]')).first();
    await expect(link).toBeVisible();
    const href = (await link.getAttribute("href")) ?? "";
    expect(href.startsWith("mailto:")).toBe(true);
    expect(decodeURIComponent(href)).toContain(`/articles/${articleIds[0]}`);
    // a mail client is not a new tab
    await expect(link).not.toHaveAttribute("target", "_blank");
  });

  test("the horizontal stack omits email @mobile", async ({ page }) => {
    await expect(visible(page.locator('main a[aria-label="Share by Email"]'))).toHaveCount(0);
  });
});
