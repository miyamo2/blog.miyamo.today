import type { Page, Route } from "@playwright/test";

/**
 * Algolia stand-in.
 *
 * The build ships fake Algolia credentials (see scripts/e2e.mjs), so the panel
 * builds a real client and issues real requests -- which are answered here
 * instead of over the network. That keeps the whole search feature under test
 * (debounce, paging, highlighting, URL sync, error handling) without an account,
 * an index, or a flaky third party.
 *
 * The client resolves `{appId}-dsn.algolia.net` first and falls back to
 * `{appId}-{1,2,3}.algolianet.com`, so both host shapes are intercepted.
 */
export const ALGOLIA_URL_PATTERNS = [
  "**://*.algolia.net/**",
  "**://*.algolianet.com/**",
  "**://*.algolia.io/**",
];

export interface MockHit {
  objectID: string;
  title: string;
  content: string;
  tags: string[];
  thumbnail: string;
}

/** enough hits to fill three pages at the panel's 5-per-page */
export const MOCK_HITS: MockHit[] = Array.from({ length: 12 }, (_, i) => ({
  objectID: `search-${i + 1}`,
  title: `検索結果の記事 ${i + 1}`,
  content: `これは検索結果 ${i + 1} の本文スニペットです。Astro と Playwright の話。`,
  tags: i % 2 === 0 ? ["Go", "AWS"] : ["Go"],
  thumbnail: "/logo.png",
}));

const HITS_PER_PAGE = 5;

interface AlgoliaQuery {
  query?: string;
  page?: number;
  hitsPerPage?: number;
}

const highlight = (value: string, query: string): string => {
  if (!query) return value;
  const index = value.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return value;
  return (
    value.slice(0, index) +
    `<mark>${value.slice(index, index + query.length)}</mark>` +
    value.slice(index + query.length)
  );
};

const page = (hits: MockHit[], query: string, pageIndex: number) => {
  const nbPages = Math.ceil(hits.length / HITS_PER_PAGE);
  const slice = hits.slice(pageIndex * HITS_PER_PAGE, (pageIndex + 1) * HITS_PER_PAGE);
  return {
    hits: slice.map((hit) => ({
      ...hit,
      _highlightResult: {
        title: { value: highlight(hit.title, query), matchLevel: "full" },
        tags: hit.tags.map((tag) => ({ value: tag, matchLevel: "none" })),
      },
      _snippetResult: {
        content: { value: highlight(hit.content, query), matchLevel: "full" },
      },
    })),
    nbHits: hits.length,
    page: pageIndex,
    nbPages,
    hitsPerPage: HITS_PER_PAGE,
    exhaustiveNbHits: true,
    query,
    params: "",
    index: "e2e-index",
    processingTimeMS: 1,
  };
};

/** the query that the panel is told matches nothing */
export const EMPTY_QUERY = "ヒットしない検索語";

export type AlgoliaMode = "ok" | "error";

interface Options {
  /** "error" makes every request fail, for the panel's failure branch */
  mode?: AlgoliaMode;
  /** hits to serve; defaults to MOCK_HITS */
  hits?: MockHit[];
}

/**
 * Installs the interception. Call before the navigation that loads the panel.
 * Returns the list of queries the panel actually asked for, so a test can assert
 * that (for example) debouncing collapsed a burst of keystrokes.
 */
export const mockAlgolia = async (target: Page, options: Options = {}): Promise<string[]> => {
  const { mode = "ok", hits = MOCK_HITS } = options;
  const queries: string[] = [];

  const handler = async (route: Route) => {
    const body = route.request().postDataJSON() as { requests?: AlgoliaQuery[] } | null;
    const requests = body?.requests ?? [{}];
    const query = requests[0]?.query ?? "";
    queries.push(query);

    if (mode === "error") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "e2e: forced failure" }),
      });
      return;
    }

    const matching = query === EMPTY_QUERY ? [] : hits;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        results: requests.map((request) => page(matching, query, request.page ?? 0)),
      }),
    });
  };

  for (const pattern of ALGOLIA_URL_PATTERNS) {
    await target.route(pattern, handler);
  }
  return queries;
};
