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
| `feeds.spec.ts` | RSS, sitemap, manifest, robots.txt |
| `seo.spec.ts` | titles, canonical, Open Graph, JSON-LD |
| `captures.spec.ts` | the screenshot sweep |

Every file runs in two projects: `desktop-chromium` (1440x900) and
`mobile-chromium` (Pixel 7). Titles tagged `@desktop` or `@mobile` run in one only.

## Captures

`captures.spec.ts` photographs every screen in light and dark, in both viewports,
into `captures/<project>/<name>.png`. They are attached to the HTML report and
uploaded by CI as the `e2e-captures` artifact on every run, pass or fail.

### On a pull request

`scripts/e2e-capture-report.mjs` puts the same screenshots in a comment, so a
change can be reviewed without downloading anything. It runs as the last step of
the E2E workflow — pass or fail — and rewrites one sticky comment per pull
request, one collapsed table per project.

A comment can only show an image from a public http(s) URL: GitHub's sanitizer
drops `data:` sources, and an artifact is a zip behind a login. So the captures
are committed and pushed — but to `refs/e2e-captures/pr-<n>/<run>`, not to a
branch. That ref is outside the default fetch refspec
(`+refs/heads/*:refs/remotes/origin/*`), so no `git clone` or `git pull` of this
repository ever carries a screenshot; it is also invisible in the branch list and
costs no Releases section. The comment then embeds
`raw.githubusercontent.com/<repo>/<commit>/<project>/<name>.png`, which resolves
without the commit being reachable from any branch — the ref alone is what keeps
the objects alive.

Nothing is ever deleted or rewritten, so a comment written months ago still
shows its screenshots. To reclaim the space of a pull request that no longer
matters:

```sh
git ls-remote origin 'refs/e2e-captures/*'
git push origin :refs/e2e-captures/pr-42/12345678.1
```

The two rejected alternatives, for the record: a branch is fetched by everyone,
and Git LFS keeps clones small but meters storage and bandwidth and does not give
the quota back when the files are deleted.

The comment appears from the first push after the pull request exists — the
workflow is driven by `push`, so a pull request opened on an already-tested
branch gets its comment on the next push.

```sh
node scripts/e2e-capture-report.mjs --dry-run  # print the comment, upload nothing
```

## The build the tests see

`scripts/e2e.mjs` builds with `ARTICLE_PER_PAGE=2` over the mock's 4 articles, so
the article list is exactly two pages and the pager has something to do. Algolia
gets fake credentials — every request the panel makes is answered in the browser by
`fixtures/algolia.ts`. There is no `OPENAI_API_KEY`, so the recommendation block
renders empty by design.
