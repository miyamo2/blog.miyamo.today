import { expect, test } from "../fixtures/test";

test.describe("about page (/about)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/about");
  });

  test("shows the GitHub profile the build fetched", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();

    const login = page.getByRole("heading", { level: 2 });
    await expect(login).toBeVisible();
    expect((await login.innerText()).trim()).not.toEqual("");

    // the bio comes straight from the GitHub GraphQL response
    await expect(page.locator("main p").first()).not.toBeEmpty();
  });

  test("renders the avatar", async ({ page }) => {
    const avatar = page.locator('img[alt="GitHubAvatar:miyamo2"]');
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute("loading", "eager");
    expect(await avatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test("links to GitHub and to every social account with an icon", async ({ page }) => {
    const github = page.locator('main a[aria-label="GitHub"]');
    await expect(github).toBeVisible();
    await expect(github).toHaveAttribute("href", /^https:\/\/github\.com\//);
    await expect(github).toHaveAttribute("target", "_blank");
    await expect(github).toHaveAttribute("rel", "noopener noreferrer");

    const socials = page.locator('main a[aria-label^="social account link:"]');
    expect(await socials.count()).toBeGreaterThan(0);
    for (const social of await socials.all()) {
      await expect(social).toHaveAttribute("href", /^https?:\/\//);
      await expect(social).toHaveAttribute("target", "_blank");
    }
  });
});
