/** Client-side counterpart of viewTransition.ts, loaded once from Layout.astro. */

/** `/articles/<id>` */
const isArticleDetail = (url: URL): boolean => /^\/articles\/[^/]+\/?$/.test(url.pathname);

/** every page built out of ArticleCard: `/`, `/pages/<n>`, `/tags/<tag>`, `/tags/<tag>/<n>` */
const isArticleList = (url: URL): boolean =>
  url.pathname === "/" ||
  /^\/pages\/[^/]+\/?$/.test(url.pathname) ||
  /^\/tags\/[^/]+(?:\/[^/]+)?\/?$/.test(url.pathname);

/* Leaving an article for a list page by link (header logo, nav, a tag, search)
   plays the card morph in reverse, but the list is rendered from the top while
   the matching card usually sits far below the fold -- the article snapshot
   flies off to an arbitrary spot, or to a card that isn't even on that page.
   Browser back keeps the morph: there the list is restored at the scroll
   position the card was clicked from, so it lands exactly where it started. */
document.addEventListener("astro:before-swap", (event) => {
  if (event.navigationType === "traverse") return;
  if (!isArticleDetail(event.from) || !isArticleList(event.to)) return;
  // skips the animation only; the DOM swap still happens
  event.viewTransition?.skipTransition();
});
