/*
 * `./search` pulls in the Algolia client on top of the panel logic, which made
 * it the largest same-origin chunk on the page (~8 KiB) even though most visits
 * never open the panel -- and, as Search.astro's own `<script>`, it sat on the
 * critical request chain of every page. Splitting it behind a dynamic import
 * takes those bytes out of the page load entirely and fetches them on the first
 * sign that someone is heading for the search button.
 * integrations/deferred-scripts injects this module.
 */
import { loadDialogs } from "../starwind/dialog/bootstrap";

let panel: Promise<unknown> | null = null;

/*
 * The panel drives the dialog it lives in -- it dispatches starwind's
 * `dialog:open` and adopts an already-open one -- so the handler goes first.
 * The extra round trip only ever lands on an intent signalled ahead of the
 * click (pointerover / focusin) or on a `?q=` load, never on a page load that
 * is not headed for the panel.
 */
const loadPanel = (): Promise<unknown> => (panel ??= loadDialogs().then(() => import("./search")));

const onSearchIntent = (event: Event): void => {
  const target = event.target;
  if (target instanceof Element && target.closest(".algolia-search")) {
    void loadPanel();
  }
};

/*
 * Delegated from `document` so this survives ClientRouter navigations: the
 * listeners outlive every swap, and this module (like all bundled module
 * scripts) is evaluated once per full page load anyway.
 *
 * pointerover and focusin both land before the click that opens the dialog, so
 * the chunk is usually already parsed by the time the panel is visible. The
 * capture-phase click is the fallback for input that reaches the trigger
 * without either -- the panel adopts an already-open dialog on init, so losing
 * that race only delays the input focus by the length of the fetch.
 */
document.addEventListener("pointerover", onSearchIntent, { passive: true });
document.addEventListener("focusin", onSearchIntent);
document.addEventListener("click", onSearchIntent, { capture: true });

/*
 * A `?q=` URL is search intent that arrived with the navigation: the panel has
 * to come up and run the query on its own, so the chunk is requested right away
 * for those loads. The literal is repeated from search.ts (QUERY_PARAM) rather
 * than imported, so that this stays a leaf of the injected script and does not
 * pull the panel onto the critical path of every page.
 * astro:after-swap covers arriving at a search URL through the client router,
 * which happens on back from an article that was opened out of the results.
 */
const wantsSearch = (): boolean => new URLSearchParams(location.search).has("q");

if (wantsSearch()) void loadPanel();
document.addEventListener("astro:after-swap", () => {
  if (wantsSearch()) void loadPanel();
});
