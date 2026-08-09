import { currentTheme, expect, test, themeToggle } from "../fixtures/test";

test.describe("theme toggle", () => {
  test("starts from the OS preference when nothing is stored", async ({ page }) => {
    // the config pins colorScheme to light for every test
    await page.goto("/");
    expect(await currentTheme(page)).toBe("light");
  });

  test.describe("with a dark OS preference", () => {
    test.use({ colorScheme: "dark" });

    test("starts dark", async ({ page }) => {
      await page.goto("/");
      expect(await currentTheme(page)).toBe("dark");
    });
  });

  test("toggling switches the theme and records the choice", async ({ page }) => {
    await page.goto("/");
    await themeToggle(page).click();

    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await currentTheme(page)).toBe("dark");
    expect(await page.evaluate(() => localStorage.getItem("colorTheme"))).toBe("dark");

    await themeToggle(page).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem("colorTheme"))).toBe("light");
  });

  test("the choice survives a reload", async ({ page }) => {
    await page.goto("/");
    await themeToggle(page).click();
    expect(await currentTheme(page)).toBe("dark");

    await page.reload();
    expect(await currentTheme(page)).toBe("dark");
  });

  test("the choice survives a client-router navigation", async ({ page }) => {
    await page.goto("/");
    await themeToggle(page).click();
    expect(await currentTheme(page)).toBe("dark");

    await page.locator("a.article-card-link").first().click();
    await expect(page.locator("article .markdown-body")).toBeVisible();
    expect(await currentTheme(page)).toBe("dark");
  });

  test("dark mode actually repaints the page", async ({ page }) => {
    await page.goto("/");
    const lightBackground = await page.evaluate(
      // bg-background lives on #layout, not on <body>
      () => getComputedStyle(document.getElementById("layout")!).backgroundColor
    );

    await themeToggle(page).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const darkBackground = await page.evaluate(
      // bg-background lives on #layout, not on <body>
      () => getComputedStyle(document.getElementById("layout")!).backgroundColor
    );

    expect(darkBackground).not.toBe(lightBackground);
  });
});
