---
name: e2e-authoring
description: Write or change Playwright end-to-end tests for blog.miyamo.today (files under e2e/). Use when adding a spec for a new screen or feature, updating specs after a UI change, adding a screenshot capture, or extending the mock data the suite builds against. For running an existing suite, use e2e-running instead.
---

# Authoring e2e tests

## Layout

```
e2e/
  package.json          own dependency tree (playwright is NOT a site dependency)
  playwright.config.ts  projects, webServer, capture-wide defaults
  fixtures/
    test.ts             extended `test`, the capture fixture, shared locators
    algolia.ts          the Algolia stand-in
  tests/*.spec.ts       one file per screen or feature
scripts/e2e.mjs         mock API -> astro build -> playwright
scripts/mock-api.mjs    the blog API / GitHub API / image mock the build reads
```

Always import from `../fixtures/test`, never from `@playwright/test` directly — the
extended `test` adds the `capture` and `articleIds` fixtures and blocks third-party
requests.

```ts
import { expect, test, visible } from "../fixtures/test";
```

## What the suite runs against

`bun run e2e` builds the real site with `scripts/mock-api.mjs` standing in for
blogapi.miyamo.today and the GitHub GraphQL API, then serves `dist/` with
`astro preview`. Consequences worth knowing before writing an assertion:

- **4 articles, 2 per page.** `ARTICLE_PER_PAGE=2` is set for the build, so the
  article list is exactly two pages. That is the only reason `Pager.astro`,
  `/pages/2` and `/tags/{tag}/2` exist to be tested at all.
- **Tags: `Go` (4 articles) and `AWS` (2).** Prefer reading them off `/tags` over
  hard-coding — see `tests/tags.spec.ts`.
- **Article ids are not stable-by-name.** Use the `articleIds` fixture, which reads
  them from `/feed/rss.xml`.
- **No recommendations.** The build runs without `OPENAI_API_KEY`, so
  `Recommend.astro` renders its heading and no cards.
- **Third-party requests are aborted** (Buy Me a Coffee, giscus, fonts from a CDN).
  Assert on what the site itself does — e.g. that `#comments` got
  `data-giscus-mounted="true"` and a `script[src*="giscus.app"]`, not that giscus
  rendered.
- **Algolia is intercepted in the browser.** Call `mockAlgolia(page)` from
  `fixtures/algolia.ts` *before* the `page.goto` that loads the panel. It returns
  the array of queries the panel actually issued, which is how the debounce test
  works.

If a test needs data the mock does not serve, extend `scripts/mock-api.mjs` — it is
the same mock the build verification uses, so keep it representative of the real
API's shape.

## Viewport projects

Two projects run every file: `desktop-chromium` (1440x900) and `mobile-chromium`
(Pixel 7). Tag a test title to restrict it:

- `@desktop` — only the desktop project (side TOC, share rail, header nav, and
  anything that would just run twice for nothing, like the feed/sitemap checks)
- `@mobile` — only the mobile project (hamburger menu, TOC floating button)
- no tag — runs in both

The header renders a mobile *and* a desktop copy of the search box and the theme
toggle. Never select them by index; use the `visible()` helper or the
`searchTrigger` / `searchDialog` / `themeToggle` helpers from `fixtures/test`.

## Selector conventions

The site ships almost no test-only attributes, so prefer, in order:

1. role + accessible name — `page.getByRole("heading", { level: 1, name: "Tags" })`
2. the `aria-label`s the components already set — `Go to next page`,
   `toggle-dark-mode`, `menu-button`, `table-of-contents-button`, `search`,
   `Share on X`, `Close dialog`
3. the behavioural hooks the source itself reads — `[data-search-input]`,
   `[data-search-hits]`, `.index-hit-card`, `.article-card`, `.article-card-link`,
   `.side-toc`, `.code-copy-button`, `img[data-remote-image]`

Starwind dialogs (`Search`, `Menu`, `TOCModal`) expose their state as
`data-state="open" | "closed"` on the `<dialog>`; assert on that rather than on
visibility, which races the open/close animation.

Adding a `data-testid` is a last resort. If you do, put it on the element the
feature already keys off, not on a wrapper.

## Captures

`capture(name)` writes `e2e/captures/<project>/<name>.png` and attaches it to the
HTML report. It freezes animations and waits for fonts and images first.

```ts
test("about page", async ({ page, capture }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
  await capture("about-light");
});
```

Options: `fullPage` (default true), `clip` (a locator, for one component),
`keepAnimations`. Names must be unique within a test.

New screens belong in the `SCREENS` table in `tests/captures.spec.ts`, which shoots
every screen in light and dark across both viewports. Keep behaviour assertions out
of that file — it exists to leave pictures behind.

## Things that bite

- **Japanese hashes.** `history.replaceState(null, "", "#はじめに")` lands in
  `location.href` percent-encoded. Compare with
  `expect.poll(() => decodeURIComponent(page.url())).toContain(href)`.
- **`/pages/1` and `/tags/{tag}/1`** are 301s that a static build emits as
  meta-refresh pages. Wait with `page.waitForURL((url) => url.pathname === "/")`,
  not with a response status assertion.
- **Search debounce is 200ms.** `fill()` fires one input event; use
  `pressSequentially` only when the point *is* the debounce.
- **View transitions.** `.header-wrapper` is `transition:persist`; a client-router
  navigation reuses the element. That is what the persistence test checks.
- **Absolute urls are production urls.** The build keeps
  `site: "https://blog.miyamo.today"`, so canonical / og:url / share links point
  there even though the page is served from 127.0.0.1.

## Before handing the work over

```sh
bun run e2e:typecheck   # tsc over e2e/
bun run e2e             # full run (builds first)
bun run e2e:rerun       # re-run against the dist/ already on disk
```

A new spec must pass in both projects, or carry an `@desktop` / `@mobile` tag
explaining why it cannot.
