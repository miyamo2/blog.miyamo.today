import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { SitemapItem } from "@astrojs/sitemap";

/** path (no trailing slash) -> ISO 8601 date of the newest article on that page */
export type LastmodStore = Record<string, string>;

/**
 * Where the page build hands its per-page `lastmod` dates to @astrojs/sitemap.
 *
 * @astrojs/sitemap's `serialize` is configured in astro.config.ts, which runs
 * as plain node and cannot import `astro:content` -- so it never sees the
 * article dates the content layer loaded. src/lib/content.ts writes them here
 * while the pages render, and `lastmodSerializer()` reads them back at
 * `astro:build:done`, by which point every page has been generated.
 *
 * It lives in the astro cache dir (`cacheDir` in astro.config.ts): it is a
 * build intermediate, so it must not land in `dist/` and get synced to S3.
 */
const STORE_PATH = resolve(process.cwd(), ".cache/sitemap-lastmod.json");

/** `/about/` and `/about` are the same page; the store is keyed by the latter */
const normalizePath = (pathname: string): string =>
  pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

export const writeLastmods = async (lastmods: LastmodStore): Promise<void> => {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(lastmods), "utf8");
};

/**
 * `serialize` for @astrojs/sitemap: stamps each URL with the date of the
 * newest article it shows.
 *
 * Google is the only consumer that reads `lastmod`, and it stops trusting the
 * field entirely once it catches a site reporting dates that did not happen --
 * so a page with nothing dateable behind it (/about, whose content is the live
 * GitHub profile) is left without one rather than given the build time.
 */
export const lastmodSerializer = (): ((item: SitemapItem) => Promise<SitemapItem>) => {
  let store: Promise<LastmodStore> | undefined;
  const load = (): Promise<LastmodStore> => {
    // no store means no page ever rendered (or a build that failed earlier);
    // a sitemap without lastmod is still valid, so degrade instead of throwing
    store ??= readFile(STORE_PATH, "utf8").then(
      (raw) => JSON.parse(raw) as LastmodStore,
      () => ({})
    );
    return store;
  };
  return async (item) => {
    const lastmods = await load();
    const lastmod = lastmods[normalizePath(new URL(item.url).pathname)];
    return lastmod ? { ...item, lastmod } : item;
  };
};
