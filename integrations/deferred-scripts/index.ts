import type { AstroIntegration } from "astro";

/*
 * The bundled counterpart to integrations/inline-scripts: the browser-side
 * modules that are not needed before the page has loaded, injected as one
 * script rather than left as component `<script>`s.
 *
 * Astro turns every component `<script>` into a chunk of its own, so the two
 * modules below used to be two more requests on the critical request chain of
 * every page -- and the second lined up behind the first, because Search.astro
 * renders inside Dialog.astro. Every `injectScript("page", ...)` call, on the
 * other hand, is concatenated into a single module (`astro:scripts/page.js`),
 * so their static imports collapse into one entry chunk: one request, whatever
 * the list below grows to.
 *
 * What may go in this list is exactly what keeps that true: a module that only
 * *watches* for the moment its feature is first needed and dynamic-imports the
 * implementation then. The implementations stay where they belong, next to the
 * component that renders their markup, and none of their bytes reach a page
 * that never uses them. A module that does real work on load belongs in the
 * component instead, where it costs its own chunk and not everyone else's.
 *
 * Specifiers are root-relative (vite resolves `/...` from the project root):
 * the injected content is loaded as the virtual `astro:scripts/page.js`, which
 * has no directory for a relative path to resolve against.
 */
const deferredModules = [
  // starwind dialogs: the search panel, the hamburger menu, the article TOC
  "/src/components/starwind/dialog/bootstrap",
  // the algolia search panel (which loads the dialog handler before itself)
  "/src/components/search/bootstrap",
];

export const deferredScripts = (): AstroIntegration => {
  return {
    name: "deferred-scripts",
    hooks: {
      "astro:config:setup": ({ injectScript }) => {
        for (const specifier of deferredModules) {
          injectScript("page", `import ${JSON.stringify(specifier)};`);
        }
      },
    },
  };
};
