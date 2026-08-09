import { expect, test } from "../fixtures/test";

test.describe("header", () => {
  test("the logo links home", async ({ page }) => {
    await page.goto("/about");
    const logo = page.locator('.header-wrapper a[href="/"]').first();
    await expect(logo.locator('img[alt="logo"]')).toBeVisible();

    await logo.click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { level: 1, name: "Articles" })).toBeVisible();
  });

  for (const [label, path, heading] of [
    ["Home", "/", "Articles"],
    ["Tags", "/tags", "Tags"],
    ["About", "/about", "About"],
  ] as const) {
    test(`the ${label} link opens ${path} @desktop`, async ({ page }) => {
      await page.goto("/about");
      // Menu.astro renders inside the header too, so its (closed, invisible)
      // dialog holds a second link to each destination
      await page
        .locator(`.header-wrapper a[href="${path}"]`)
        .filter({ visible: true, hasText: label })
        .click();
      await page.waitForURL((url) => url.pathname === path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    });
  }

  test("the RSS link points at the feed @desktop", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('.header-wrapper a[href="/feed/rss.xml"]')).toContainText("RSS");
  });

  test("the header survives a client-router navigation", async ({ page }) => {
    await page.goto("/");
    // transition:persist means the very same element is reused across the swap
    await page.evaluate(() => {
      const header = document.querySelector(".header-wrapper") as HTMLElement & {
        __e2e?: string;
      };
      header.__e2e = "persisted";
    });

    await page.locator("a.article-card-link").first().click();
    await expect(page.locator("article .markdown-body")).toBeVisible();

    const persisted = await page.evaluate(
      () => (document.querySelector(".header-wrapper") as HTMLElement & { __e2e?: string }).__e2e
    );
    expect(persisted).toBe("persisted");
  });

  test("the footer is on every page", async ({ page }) => {
    for (const path of ["/", "/tags", "/about"]) {
      await page.goto(path);
      await expect(page.locator("#footer")).toContainText("Copyright © miyamo2");
    }
  });
});

test.describe("mobile menu @mobile", () => {
  test("opens, lists the destinations and closes again", async ({ page }) => {
    await page.goto("/");

    const trigger = page.locator('button[aria-label="menu-button"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.locator("#menu-modal dialog");
    await expect(dialog).toHaveAttribute("data-state", "open");
    await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
    for (const [label, path] of [
      ["Home", "/"],
      ["Tags", "/tags"],
      ["About", "/about"],
    ] as const) {
      await expect(dialog.locator(`a[href="${path}"]`)).toContainText(label);
    }

    await dialog.locator("button[data-dialog-close]").click();
    await expect(dialog).toHaveAttribute("data-state", "closed");
  });

  test("picking a destination navigates and closes the menu", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[aria-label="menu-button"]').click();

    const dialog = page.locator("#menu-modal dialog");
    await expect(dialog).toHaveAttribute("data-state", "open");
    await dialog.locator('a[href="/tags"]').click();

    await page.waitForURL((url) => url.pathname === "/tags");
    await expect(page.getByRole("heading", { level: 1, name: "Tags" })).toBeVisible();
    await expect(page.locator("#menu-modal dialog")).toHaveAttribute("data-state", "closed");
  });

  test("the desktop nav is not rendered on a phone", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('.header-wrapper a[href="/feed/rss.xml"]')).toBeHidden();
  });
});
