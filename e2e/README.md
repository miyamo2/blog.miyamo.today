# e2e

Playwright end-to-end tests for blog.miyamo.today.

The suite runs against a **production build** served by `astro preview`, with
`scripts/mock-api.mjs` standing in for blogapi.miyamo.today and the GitHub GraphQL
API — so it needs no credentials and produces the same site on every run.

Dependencies live in this directory's own `package.json` (the same arrangement as
`dev/mock-blogapi`), so Playwright never enters the site's dependency tree.

## Usage

```sh
bun install        # site dependencies
bun run e2e:setup  # this directory's dependencies + chromium (once)

bun run e2e        # build + run everything
bun run e2e:rerun  # re-run against the dist/ already on disk
bun run e2e:ui     # playwright UI mode
bun run e2e:report # open the last HTML report
```

Arguments are forwarded to `playwright test`:

```sh
bun run e2e:rerun tests/search.spec.ts
bun run e2e:rerun -g "the pager walks" --project=mobile-chromium
```

## What it covers

| file | screen / feature |
| --- | --- |
| `article-list.spec.ts` | `/` — cards, thumbnails, links, LCP hints |
| `pagination.spec.ts` | the pager, `/pages/2`, the `/pages/1` redirect |
| `tags.spec.ts` | `/tags`, `/tags/{tag}`, tag pagination |
| `article-detail.spec.ts` | `/articles/{id}` — markdown, code copy, images, link cards, comments, share buttons |
| `toc.spec.ts` | side table of contents and the mobile TOC modal |
| `about.spec.ts` | `/about` — profile, avatar, social links |
| `not-found.spec.ts` | the 404 page and its Go Back button |
| `navigation.spec.ts` | header, footer, mobile menu, view-transition persistence |
| `theme.spec.ts` | light/dark toggle and its persistence |
| `search.spec.ts` | the Algolia panel — querying, paging, URL sync, failure states |
| `fonts.spec.ts` | the build-time font subsets and the full-face fallback |
| `feeds.spec.ts` | RSS, sitemap, manifest, robots.txt |
| `seo.spec.ts` | titles, canonical, Open Graph, JSON-LD |
| `captures.spec.ts` | the screenshot sweep |

Every file runs in two projects: `desktop-chromium` (1440x900) and
`mobile-chromium` (Pixel 7). Titles tagged `@desktop` or `@mobile` run in one only.

## Captures

`captures.spec.ts` photographs every screen in light and dark, in both viewports,
into `captures/<project>/<name>.png`. They are attached to the HTML report and
uploaded by CI as the `e2e-captures` artifact on every run, pass or fail.

## The build the tests see

`scripts/e2e.mjs` builds with `ARTICLE_PER_PAGE=2` over the mock's 4 articles, so
the article list is exactly two pages and the pager has something to do. Algolia
gets fake credentials — every request the panel makes is answered in the browser by
`fixtures/algolia.ts`. There is no `OPENAI_API_KEY`, so the recommendation block
renders empty by design.
