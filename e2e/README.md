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

### On a pull request

[`miyamo2/contact-sheet`](https://github.com/miyamo2/contact-sheet) puts the same
screenshots in a comment, so a change can be reviewed without downloading
anything: one sticky comment per pull request, rewritten on every push, with one
collapsed table per project, one row per screen and one column per theme.

It runs in a workflow of its own — `.github/workflows/contact-sheet.yaml`, on
`workflow_run` — rather than as a last step of E2E, which is the
[arrangement the action recommends](https://github.com/miyamo2/contact-sheet#recommended--two-workflows).
E2E then needs no write permission at all: it runs the suite and uploads the
`e2e-captures` artifact, and that artifact is the only thing that crosses to the
job holding the token. A `workflow_run` job is always the default branch's,
whatever branch was tested, so the token and the tested branch's code never share
a job — which is what makes commenting on a fork's pull request safe, should the
suite ever be driven by `pull_request` instead of `push`.

Two consequences of that split are worth knowing before editing either file:
GitHub only ever runs the default branch's copy of a `workflow_run` workflow, so
changes to `contact-sheet.yaml` or to the comment template take effect once
merged rather than on the branch making them; and the comment arrives a little
after the E2E run finishes, as a second run in the Actions tab.

A comment can only show an image from a public http(s) URL: GitHub's sanitizer
drops `data:` sources, and an artifact is a zip behind a login. So the captures
are committed and pushed — but to `refs/contact-sheet/pr-<n>/<run>`, not to a
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
git ls-remote origin 'refs/contact-sheet/*'
git push origin :refs/contact-sheet/pr-42/12345678.1
```

(Runs from before the switch are under `refs/e2e-captures/*`, and are deleted the
same way.)

The two rejected alternatives, for the record: a branch is fetched by everyone,
and Git LFS keeps clones small but meters storage and bandwidth and does not give
the quota back when the files are deleted.

The comment appears from the first push after the pull request exists — E2E is
driven by `push`, so a pull request opened on an already-tested branch gets its
comment on the next push.

The comment's layout is `.github/e2e-captures.tmpl`, which can be rendered against
whatever the last run left in `captures/`, without a token and without pushing
anything:

```sh
go run github.com/miyamo2/contact-sheet/cmd/contact-sheet@v0.1.1 --dry-run \
  --path e2e/captures --title '📸 E2E captures' --row-label screen \
  --template-files .github/e2e-captures.tmpl \
  --layout '^(?:[^/]+/)?(?P<screen>.+?)(?:-(?P<theme>light|dark))?\.png$'
```

## The build the tests see

`scripts/e2e.mjs` builds with `ARTICLE_PER_PAGE=2` over the mock's 4 articles, so
the article list is exactly two pages and the pager has something to do. Algolia
gets fake credentials — every request the panel makes is answered in the browser by
`fixtures/algolia.ts`. There is no `OPENAI_API_KEY`, so the recommendation block
renders empty by design.
