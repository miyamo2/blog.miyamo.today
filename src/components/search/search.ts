import { liteClient } from "algoliasearch/lite";
import { faChevronLeft, faChevronRight, faTags } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import {
  PUBLIC_ALGOLIA_APP_ID,
  PUBLIC_ALGOLIA_INDEX_NAME,
  PUBLIC_ALGOLIA_SEARCH_KEY,
} from "astro:env/client";

const HITS_PER_PAGE = 5;
const DEBOUNCE_MS = 200;
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * The query parameters the panel is routed by, mirroring instantsearch's simple
 * state mapping (`?q=&page=`). `page` is 1-based in the URL and 0-based here,
 * matching what Algolia's `page` means.
 * The bootstrap in Search.astro repeats the `q` literal so it can stay a
 * standalone chunk -- keep the two in sync.
 */
const QUERY_PARAM = "q";
const PAGE_PARAM = "page";
/** how long a URL-driven open keeps waiting for the starwind dialog handler */
const OPEN_RETRY_FRAMES = 20;

interface HitDoc {
  objectID: string;
  title: string;
  content: string;
  tags: string[];
  thumbnail: string;
  _highlightResult?: {
    title?: { value: string };
    tags?: { value: string }[];
  };
  _snippetResult?: {
    content?: { value: string };
  };
}

interface SearchPage {
  hits: HitDoc[];
  nbHits: number;
  nbPages: number;
  page: number;
}

/** the panel state a URL can carry; `page` is 0-based, as in the Algolia response */
interface RouteState {
  query: string;
  page: number;
}

/** null when the URL carries no search state at all */
const readRoute = (): RouteState | null => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(QUERY_PARAM)) return null;
  const page = Number.parseInt(params.get(PAGE_PARAM) ?? "", 10);
  return {
    query: params.get(QUERY_PARAM) ?? "",
    page: Number.isInteger(page) && page > 1 ? page - 1 : 0,
  };
};

/**
 * Writes the panel state onto the current URL, or strips it again when the state
 * is null.
 *
 * replaceState throughout, never pushState: the panel is a modal on top of the
 * page it was opened from, not a page of its own. Pushing an entry per query
 * would bury the previous page under a pile of half-typed searches, and it would
 * fight the browsers that already route the back gesture to an open <dialog>
 * (CloseWatcher) -- back would then pop our entry instead of closing the panel.
 * The trade-off is that back does not undo a search; every other exit does.
 *
 * The existing history state is carried over so the client router keeps the
 * scroll position it stored for this entry.
 */
const writeRoute = (state: RouteState | null): void => {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  if (state === null) {
    params.delete(QUERY_PARAM);
    params.delete(PAGE_PARAM);
  } else {
    params.set(QUERY_PARAM, state.query);
    if (state.page > 0) {
      params.set(PAGE_PARAM, String(state.page + 1));
    } else {
      params.delete(PAGE_PARAM);
    }
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
};

/**
 * The credentials are optional in the env schema (see astro.config.ts), so a build
 * without Algolia keys must not blow up on the client - the panel simply reports
 * that search is unavailable.
 */
const searchClient =
  PUBLIC_ALGOLIA_APP_ID && PUBLIC_ALGOLIA_SEARCH_KEY && PUBLIC_ALGOLIA_INDEX_NAME
    ? liteClient(PUBLIC_ALGOLIA_APP_ID, PUBLIC_ALGOLIA_SEARCH_KEY)
    : null;

const requestPage = async (query: string, page: number): Promise<SearchPage> => {
  const response = await searchClient!.search<HitDoc>({
    requests: [
      {
        indexName: PUBLIC_ALGOLIA_INDEX_NAME,
        query,
        page,
        hitsPerPage: HITS_PER_PAGE,
        highlightPreTag: "<mark>",
        highlightPostTag: "</mark>",
        attributesToSnippet: ["content:20"],
        snippetEllipsisText: "…",
      },
    ],
  });
  return response.results[0] as unknown as SearchPage;
};

/** Builds an inline SVG from a Font Awesome icon definition, mirroring FaIcon.astro. */
const faSvg = (icon: IconDefinition, className?: string): SVGSVGElement => {
  const [width, height, , , svgPathData] = icon.icon;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className ? `fa-icon ${className}` : "fa-icon");
  for (const d of Array.isArray(svgPathData) ? svgPathData : [svgPathData]) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  return svg;
};

/**
 * Algolia escapes the indexed text before wrapping matches, so the only markup a
 * highlighted value can contain is the `<mark>` pair configured above. Values that
 * are missing fall back to the raw field, which is assigned as text.
 */
const setHighlighted = (target: HTMLElement, highlighted?: string, fallback?: string): void => {
  if (highlighted) {
    target.innerHTML = highlighted;
  } else {
    target.textContent = fallback ?? "";
  }
};

/** Thumbnails come from the index, so only let through URLs an <img> can safely load. */
const safeImageUrl = (url?: string): string | null => {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  return /^https?:\/\//i.test(url) ? url : null;
};

/** every page while they fit, otherwise both edges plus the current page's neighbours */
const pageWindow = (currentPage: number, totalPages: number): (number | "ellipsis")[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const first = Math.max(2, currentPage - 1);
  const last = Math.min(totalPages - 1, currentPage + 1);
  return [
    1,
    ...(first > 2 ? (["ellipsis"] as const) : []),
    ...Array.from({ length: last - first + 1 }, (_, i) => first + i),
    ...(last < totalPages - 1 ? (["ellipsis"] as const) : []),
    totalPages,
  ];
};

class SearchPanel {
  private readonly root: HTMLElement;
  private readonly dialog: HTMLDialogElement;
  private readonly input: HTMLInputElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly results: HTMLElement;
  private readonly count: HTMLElement;
  private readonly status: HTMLElement;
  private readonly hits: HTMLElement;
  private readonly pager: HTMLElement;

  /** true while an IME composition is in flight; queries wait for compositionend */
  private composing = false;
  private debounceId: number | null = null;
  /** monotonic id so a slow response can never overwrite a newer one */
  private requestId = 0;
  private page = 0;
  /**
   * set while a click on a hit is taking the visitor off this page: the closing
   * dialog must not rewrite a URL the router is about to replace anyway
   */
  private navigatingAway = false;

  constructor(root: HTMLElement) {
    const dialog = root.querySelector("dialog");
    const input = root.querySelector<HTMLInputElement>("[data-search-input]");
    const clearButton = root.querySelector<HTMLButtonElement>("[data-search-clear]");
    const results = root.querySelector<HTMLElement>("[data-search-results]");
    const count = root.querySelector<HTMLElement>("[data-search-count]");
    const status = root.querySelector<HTMLElement>("[data-search-status]");
    const hits = root.querySelector<HTMLElement>("[data-search-hits]");
    const pager = root.querySelector<HTMLElement>("[data-search-pager]");

    if (!dialog || !input || !clearButton || !results || !count || !status || !hits || !pager) {
      throw new Error("Search: markup is incomplete");
    }

    this.root = root;
    this.dialog = dialog;
    this.input = input;
    this.clearButton = clearButton;
    this.results = results;
    this.count = count;
    this.status = status;
    this.hits = hits;
    this.pager = pager;

    this.setupEvents();
  }

  private setupEvents(): void {
    this.input.addEventListener("input", () => {
      this.clearButton.hidden = this.input.value.length === 0;
      // a query fired mid-composition would search the unconverted kana
      if (this.composing) return;
      this.scheduleSearch();
    });

    this.input.addEventListener("compositionstart", () => {
      this.composing = true;
    });

    this.input.addEventListener("compositionend", () => {
      this.composing = false;
      this.scheduleSearch();
    });

    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        // nothing to submit; run whatever is typed right away
        event.preventDefault();
        this.cancelPending();
        void this.search(true);
      }
    });

    this.clearButton.addEventListener("click", () => {
      this.cancelPending();
      this.input.value = "";
      this.clearButton.hidden = true;
      this.clearResults();
      this.input.focus();
    });

    // clicking a result navigates away; close the dialog so it isn't still
    // open when the header (persisted across ClientRouter transitions) reappears
    this.hits.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("a")) {
        this.navigatingAway = true;
        this.root.dispatchEvent(new CustomEvent("dialog:close"));
      }
    });

    // the starwind dialog exposes no open event, so follow the `open` attribute it toggles
    const observer = new MutationObserver(() => {
      if (this.dialog.open) {
        activePanel = this;
        requestAnimationFrame(() => this.input.focus({ preventScroll: true }));
      } else {
        // reset() drops the search state from the URL, so it still needs to be
        // the active panel while it runs
        this.reset();
        if (activePanel === this) activePanel = null;
      }
    });
    observer.observe(this.dialog, { attributes: true, attributeFilter: ["open"] });
  }

  /**
   * The module is fetched on the first sign of search intent (see Search.astro),
   * so the dialog can already be open -- and can already hold typed text -- by the
   * time the panel wires itself up. The observer above only reports later
   * transitions of the `open` attribute, so catch up with the state the markup is
   * already in instead of waiting for the next open.
   */
  public adoptCurrentState(): void {
    if (!this.dialog.open) return;
    activePanel = this;
    this.clearButton.hidden = this.input.value.length === 0;
    requestAnimationFrame(() => this.input.focus({ preventScroll: true }));
    if (this.input.value.trim() !== "") void this.search(true);
  }

  /** Header.astro renders a mobile and a desktop copy; only one of them is on screen */
  public isVisible(): boolean {
    return this.root.getClientRects().length > 0;
  }

  public isConnected(): boolean {
    return this.root.isConnected;
  }

  /**
   * Brings the panel in line with the state a URL describes: opens it and runs
   * the query, or closes it when the URL no longer carries a search.
   *
   * `force` marks the call that follows a navigation, which is the only one
   * allowed to close the panel -- on init a missing `?q=` just means there is
   * nothing to restore.
   */
  public applyRoute(route: RouteState | null, force: boolean): void {
    // A query already sitting in an open panel outranks the URL: on init it is
    // what the visitor typed before this module finished loading, and after a
    // navigation it is what they typed while the transition was still animating.
    const typed = this.dialog.open && this.input.value.trim() !== "";
    if (typed && (route !== null || !force)) return;
    this.cancelPending();

    if (route === null) {
      // Only a navigation means "this panel should not be open". On init a
      // missing `?q=` just means there is nothing to restore -- and the panel is
      // very often already open by then, since the click that opens it is also
      // what starts loading this module.
      if (force && this.dialog.open) this.root.dispatchEvent(new CustomEvent("dialog:close"));
      return;
    }

    this.input.value = route.query;
    this.clearButton.hidden = route.query.length === 0;
    this.page = route.page;

    if (!this.dialog.open) {
      // the mutation observer only sees the attribute change a tick later, and
      // the search below already wants to own the URL
      activePanel = this;
      this.requestOpen(0);
    }

    if (route.query.trim() === "") {
      this.clearResults();
      return;
    }
    void this.search(false);
  }

  /**
   * `dialog:open` is starwind's programmatic entry point, and it is a no-op until
   * Dialog.astro's script has wired its handler up. A `?q=` load asks for the
   * panel before any interaction, early enough to lose that race, so keep asking
   * for a few frames. Once the dialog is open the next attempt returns straight
   * away, which also keeps this from re-opening a panel the visitor just closed.
   */
  private requestOpen(attempt: number): void {
    if (this.dialog.open) return;
    this.root.dispatchEvent(new CustomEvent("dialog:open"));
    if (attempt >= OPEN_RETRY_FRAMES) return;
    requestAnimationFrame(() => this.requestOpen(attempt + 1));
  }

  /** the URL only ever follows the panel that is actually open */
  private syncRoute(state: RouteState | null): void {
    if (activePanel !== this || this.navigatingAway) return;
    writeRoute(state);
  }

  private cancelPending(): void {
    if (this.debounceId !== null) {
      clearTimeout(this.debounceId);
      this.debounceId = null;
    }
  }

  private scheduleSearch(): void {
    this.cancelPending();
    this.debounceId = window.setTimeout(() => {
      this.debounceId = null;
      void this.search(true);
    }, DEBOUNCE_MS);
  }

  private async search(resetPage: boolean): Promise<void> {
    if (resetPage) this.page = 0;

    const query = this.input.value.trim();
    if (query === "") {
      // no request for an empty query, matching the old useSearchClient short circuit
      this.clearResults();
      return;
    }

    // written before the request so a shared URL matches what was asked for even
    // if the response never arrives
    this.syncRoute({ query, page: this.page });

    if (!searchClient) {
      this.showStatus("Search is unavailable right now.");
      return;
    }

    const requestId = ++this.requestId;
    try {
      const result = await requestPage(query, this.page);
      if (requestId !== this.requestId) return;
      this.render(result);
    } catch {
      if (requestId !== this.requestId) return;
      this.showStatus("Search failed. Please try again.");
    }
  }

  private render(result: SearchPage): void {
    this.page = result.page;
    this.results.hidden = false;

    // a hand-written ?page= can point past the end, which Algolia answers with an
    // empty hit list rather than by clamping; retry on the last page that exists
    if (result.hits.length === 0 && result.nbPages > 0 && result.page >= result.nbPages) {
      this.page = result.nbPages - 1;
      void this.search(false);
      return;
    }

    if (result.nbHits === 0) {
      this.showStatus("No articles matched your search.");
      return;
    }

    this.status.hidden = true;
    this.count.hidden = false;
    this.count.textContent = `${result.nbHits} result${result.nbHits === 1 ? "" : "s"}`;

    this.hits.replaceChildren(...result.hits.map((hit) => this.buildCard(hit)));
    this.renderPager(result.nbPages);
  }

  private buildCard(hit: HitDoc): HTMLAnchorElement {
    const card = document.createElement("a");
    card.className = "index-hit-card transform-scaleup-then-hover";
    card.href = `/articles/${encodeURIComponent(hit.objectID)}`;
    card.setAttribute("aria-label", `link: ${hit.title}`);

    const imageWrapper = document.createElement("span");
    imageWrapper.className = "hit-image";
    const thumbnail = safeImageUrl(hit.thumbnail);
    if (thumbnail) {
      const image = document.createElement("img");
      image.src = thumbnail;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      imageWrapper.appendChild(image);
    }

    const title = document.createElement("h2");
    title.className = "hit-title";
    setHighlighted(title, hit._highlightResult?.title?.value, hit.title);

    const content = document.createElement("p");
    content.className = "hit-content";
    setHighlighted(content, hit._snippetResult?.content?.value, hit.content);

    const tags = document.createElement("p");
    tags.className = "hit-tags";
    tags.appendChild(faSvg(faTags));
    const tagList = document.createElement("span");
    setHighlighted(
      tagList,
      hit._highlightResult?.tags?.map((tag) => tag.value).join(", "),
      (hit.tags ?? []).join(", "),
    );
    tags.appendChild(tagList);

    card.append(imageWrapper, title, content, tags);
    return card;
  }

  private renderPager(nbPages: number): void {
    this.pager.replaceChildren();
    if (nbPages <= 1) {
      this.pager.hidden = true;
      return;
    }
    this.pager.hidden = false;

    const current = this.page;
    this.pager.appendChild(
      this.stepButton(faChevronLeft, "Go to previous page", current - 1, current === 0),
    );

    for (const item of pageWindow(current + 1, nbPages)) {
      if (item === "ellipsis") {
        const ellipsis = document.createElement("span");
        ellipsis.className = "search-pager-ellipsis";
        ellipsis.textContent = "…";
        ellipsis.setAttribute("aria-hidden", "true");
        this.pager.appendChild(ellipsis);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(item);
      button.setAttribute("aria-label", `Go to page ${item}`);
      if (item === current + 1) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => this.goToPage(item - 1));
      this.pager.appendChild(button);
    }

    this.pager.appendChild(
      this.stepButton(faChevronRight, "Go to next page", current + 1, current >= nbPages - 1),
    );
  }

  private stepButton(
    icon: IconDefinition,
    label: string,
    page: number,
    disabled: boolean,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = disabled;
    button.setAttribute("aria-label", label);
    button.appendChild(faSvg(icon));
    button.addEventListener("click", () => this.goToPage(page));
    return button;
  }

  private goToPage(page: number): void {
    this.cancelPending();
    this.page = page;
    this.results.scrollTo({ top: 0 });
    void this.search(false);
  }

  private showStatus(message: string): void {
    this.results.hidden = false;
    this.count.hidden = true;
    this.hits.replaceChildren();
    this.pager.replaceChildren();
    this.pager.hidden = true;
    this.status.hidden = false;
    this.status.textContent = message;
  }

  private clearResults(): void {
    // any response still in flight belongs to a query that no longer exists
    this.requestId++;
    this.page = 0;
    this.syncRoute(null);
    this.results.hidden = true;
    this.count.hidden = true;
    this.count.textContent = "";
    this.status.hidden = true;
    this.status.textContent = "";
    this.hits.replaceChildren();
    this.pager.replaceChildren();
    this.pager.hidden = true;
  }

  /** back to the state the panel had before it was ever opened */
  private reset(): void {
    this.cancelPending();
    this.composing = false;
    this.input.value = "";
    this.clearButton.hidden = true;
    this.clearResults();
    this.navigatingAway = false;
  }
}

const initialized = new WeakSet<HTMLElement>();
const panels: SearchPanel[] = [];
/** the panel whose dialog is open, and therefore the one the URL belongs to */
let activePanel: SearchPanel | null = null;

/** the on-screen copy, falling back to the first one before any layout exists */
const routedPanel = (): SearchPanel | null =>
  activePanel ?? panels.find((panel) => panel.isVisible()) ?? panels[0] ?? null;

const applyRoute = (force: boolean): void => {
  routedPanel()?.applyRoute(readRoute(), force);
};

const setupSearchPanels = (): void => {
  // the header is transition:persist'ed, so these normally survive a swap; drop
  // the ones that did not rather than routing a detached panel
  for (let i = panels.length - 1; i >= 0; i--) {
    if (!panels[i].isConnected()) panels.splice(i, 1);
  }
  if (activePanel && !activePanel.isConnected()) activePanel = null;

  // Header.astro renders the component twice (mobile / desktop); one broken
  // instance must not take the other one down with it
  document.querySelectorAll<HTMLElement>(".algolia-search").forEach((root) => {
    if (initialized.has(root)) return;
    initialized.add(root);
    try {
      const panel = new SearchPanel(root);
      panels.push(panel);
      panel.adoptCurrentState();
    } catch (error) {
      console.error(error);
    }
  });
};

/**
 * The client router's `finished` promise for the navigation in flight.
 *
 * The panel cannot be opened as soon as the new page is swapped in: the
 * `::view-transition` pseudo-elements paint *above* the top layer, so a modal
 * opened while they are still animating spends the rest of the transition
 * behind a snapshot of the page being left. `astro:page-load` is no help -- the
 * router fires it on updateCallbackDone, before those animations run -- so take
 * the transition's own promise, which resolves once they are done (and which
 * the router also provides, already resolved, when it swaps without animating).
 */
let transitionFinished: Promise<unknown> = Promise.resolve();
/**
 * Bumped as each navigation starts. A transition can still be animating when the
 * next navigation begins, and its `finished` promise then resolves against a URL
 * that already belongs to the newer one -- so a deferred apply checks that it is
 * still the current navigation's.
 */
let navigationId = 0;

document.addEventListener("astro:before-preparation", () => {
  navigationId++;
});

document.addEventListener("astro:before-swap", (event) => {
  const { viewTransition } = event as Event & {
    viewTransition?: { finished?: Promise<unknown> };
  };
  transitionFinished = viewTransition?.finished?.catch(() => undefined) ?? Promise.resolve();
});

setupSearchPanels();
applyRoute(false);

/*
 * Every history navigation on this site goes through the client router (the
 * layout renders it on every page), so its swap is the one signal to follow --
 * a popstate listener of our own would only re-open the panel a beat too early,
 * before the swap it triggers.
 */
document.addEventListener("astro:after-swap", () => {
  setupSearchPanels();
  const id = navigationId;
  void transitionFinished.then(() => {
    if (id !== navigationId) return;
    applyRoute(true);
  });
});
