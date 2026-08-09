import { expect, test } from "../fixtures/test";

test.describe("404 page", () => {
  test("an unknown path serves the not-found page", async ({ page }) => {
    const response = await page.goto("/this-path-does-not-exist");
    expect(response?.status()).toBe(404);

    await expect(page.getByRole("heading", { level: 1, name: "Page Not Found" })).toBeVisible();
    await expect(page.getByText("Oops! This page has been removed or relocated.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Go Back" })).toBeVisible();
  });

  test("Go Back returns to the previous page", async ({ page }) => {
    await page.goto("/about");
    await page.goto("/this-path-does-not-exist");

    await page.getByRole("button", { name: "Go Back" }).click();
    await page.waitForURL((url) => url.pathname === "/about");
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
  });

  test("the header is still usable from the 404 page", async ({ page }) => {
    await page.goto("/this-path-does-not-exist");
    await page.locator('header, .header-wrapper').first().waitFor();
    await page.locator('a[href="/"]').first().click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { level: 1, name: "Articles" })).toBeVisible();
  });
});
