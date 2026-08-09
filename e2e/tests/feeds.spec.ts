import { expect, test } from "../fixtures/test";

// static assets and generated documents; no browser needed, so these run once
test.describe.configure({ mode: "parallel" });

test.describe("generated documents @desktop", () => {
  test("the RSS feed lists every article", async ({ request, articleIds }) => {
    const response = await request.get("/feed/rss.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");

    const xml = await response.text();
    expect(xml).toContain("<rss");
    expect(xml).toContain("blog.miyamo.today :: RSS feed");
    expect(xml).toContain("<language>ja</language>");
    for (const id of articleIds) {
      expect(xml).toContain(`https://blog.miyamo.today/articles/${id}`);
    }
  });

  test("the sitemap indexes the site and skips the redirecting page 1s", async ({ request }) => {
    const index = await request.get("/sitemap-index.xml");
    expect(index.status()).toBe(200);

    const indexXml = await index.text();
    const [firstSitemap] = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(firstSitemap).toBeTruthy();

    const sitemap = await request.get(new URL(firstSitemap).pathname);
    expect(sitemap.status()).toBe(200);
    const sitemapXml = await sitemap.text();

    expect(sitemapXml).toContain("https://blog.miyamo.today/");
    // /pages/1 and /tags/{tag}/1 are 301s; listing them earns nothing but
    // "page with redirect" reports
    expect(sitemapXml).not.toMatch(/<loc>[^<]*\/pages\/1\/?<\/loc>/);
    expect(sitemapXml).not.toMatch(/<loc>[^<]*\/tags\/[^/<]+\/1\/?<\/loc>/);
    // articles carry a lastmod so a crawler can tell an edit happened
    expect(sitemapXml).toContain("<lastmod>");
  });

  test("the web manifest is served", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = JSON.parse(await response.text());
    expect(manifest.name ?? manifest.short_name).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test("robots.txt is served", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("User-agent");
  });
});
