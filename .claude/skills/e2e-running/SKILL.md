---
name: e2e-running
description: Run the Playwright end-to-end suite for blog.miyamo.today and read its results — full runs, a single spec, headed/UI/debug modes, the screenshot captures, the HTML report, and the E2E GitHub Actions workflow. Use when asked to run the e2e tests, capture screenshots of the site, check whether a change broke a screen, or diagnose a failing e2e job. For writing new specs, use e2e-authoring instead.
---

# Running the e2e suite

## One-time setup

```sh
bun install          # site dependencies (needs GITHUB_TOKEN, see .npmrc)
bun run e2e:setup    # e2e/ dependencies + chromium
```

`e2e:setup` is what CI runs too. `bun run e2e` installs the e2e dependencies on its
own if they are missing, but it will not download a browser for you.

## The run

```sh
bun run e2e
```

That is: start `scripts/mock-api.mjs` → `astro build` against it → `playwright test`,
which brings up `astro preview` itself. The build is the slow part (a couple of
minutes); everything after it is seconds.

| command | use |
| --- | --- |
| `bun run e2e` | everything, from a fresh build |
| `bun run e2e:rerun` | re-run against the `dist/` already on disk — the loop to use while iterating on a spec |
| `bun run e2e:ui` | Playwright's UI mode (time-travel, watch, pick-locator) |
| `bun run e2e:headed` | watch a real browser window |
| `bun run e2e:debug` | step through with the inspector |
| `bun run e2e:report` | open the HTML report of the last run |
| `bun run e2e:typecheck` | `tsc` over `e2e/` |

Anything after the script name is passed straight to `playwright test`:

```sh
bun run e2e:rerun tests/search.spec.ts            # one file
bun run e2e:rerun -g "the pager walks"            # one test by title
bun run e2e:rerun --project=mobile-chromium       # one viewport
bun run e2e:rerun --repeat-each=5 -g "@mobile"    # hunt a flake
```

Env knobs: `E2E_PORT` (preview, default 4321), `E2E_MOCK_PORT` (mock API, default
8787), `E2E_SKIP_BUILD=1` (same as `--skip-build`), `E2E_CAPTURE_DIR`.

## What a run leaves behind

- `e2e/captures/<project>/<name>.png` — the deliberate screenshots. Every screen in
  light and dark, at 1440x900 (`desktop-chromium`) and Pixel 7
  (`mobile-chromium`), plus the search panel, the mobile menu and the TOC modal.
  Written on pass and on fail.
- `e2e/playwright-report/` — the HTML report; every capture is attached to the test
  that took it.
- `e2e/test-results/` — traces, videos and failure screenshots, kept only for
  failures.

To hand a screenshot to someone, take it from `e2e/captures/`. To explain a
failure, open the trace: `cd e2e && ./node_modules/.bin/playwright show-trace
test-results/<test>/trace.zip`.

## Reading a failure

1. **Everything failed at once, with a blank page.** The build probably did not
   produce what the suite expects. Look at the `astro build` output above the
   playwright run; a missing `GITHUB_TOKEN` (GitHub Packages) or an unreachable
   mock API are the usual causes.
2. **`no articles found in /feed/rss.xml`.** The build ran without the mock, so the
   site has no content. Re-run `bun run e2e` rather than `e2e:rerun`.
3. **One spec, one project.** Check the tag: `@desktop` / `@mobile` tests are meant
   to run in one project only. A test with no tag that only passes in one is a real
   bug in the test or in the responsive layout.
4. **Search specs failing together.** The Algolia stand-in is registered per test
   with `mockAlgolia(page)`; if a request escaped it, the panel shows
   "Search failed. Please try again." — the intercept was registered after the
   navigation.
5. **A capture test is red.** Captures assert almost nothing; a failure there is a
   page that never reached its ready state, not a pixel difference (the suite does
   no visual diffing).

Re-running a single failing test in UI mode is almost always faster than reasoning
about it:

```sh
bun run e2e:ui tests/<file>.spec.ts
```

## CI

`.github/workflows/e2e.yaml` runs on every push to any branch, and on
`workflow_dispatch`. It needs no deploy secrets — only the default `GITHUB_TOKEN`,
for the `@miyamo2` package on GitHub Packages.

Two artifacts are uploaded on every run, pass or fail: **e2e-captures** (the
screenshots) and **e2e-report** (the HTML report plus traces and videos). Download
`e2e-report`, unzip it, and open `playwright-report/index.html` to get the same
view as a local run.

If a job fails only in CI, reproduce it with a clean build locally
(`bun run e2e`), and check the viewport: CI runs both projects, and a local
`--project=desktop-chromium` habit hides mobile regressions.
