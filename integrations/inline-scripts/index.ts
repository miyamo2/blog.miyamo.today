import type { AstroIntegration } from "astro";
import { transformWithEsbuild } from "vite";

/*
 * The page-level inline scripts, previously written as `<script is:inline
 * set:html={...}>` in Layout.astro and BaseHead.astro. `injectScript`
 * emits them verbatim into the `<head>` of every page, which buys two things
 * the component-authored form did not have:
 *
 *   - `security.csp` digests them automatically. Astro only hashes the scripts
 *     it injected itself (plus the built client chunks), so an inline <script>
 *     written in a component is invisible to it and would need a hand-kept
 *     entry in `security.csp.scriptDirective.hashes` that silently breaks the
 *     page the first time someone edits the script and forgets the hash.
 *   - the ClientRouter's already-executed check matches inline scripts on their
 *     text, and injected scripts are byte-identical on every page, so each of
 *     these still runs exactly once per full page load and never re-registers
 *     its listeners on a navigation.
 *
 * Injected scripts are appended after the stylesheet link at the end of <head>,
 * later than where these used to sit. They are still classic scripts in <head>,
 * so they all run before the body is parsed: the theme toggle below applies
 * ahead of first paint even when the render-blocking stylesheet is slow, since
 * the paint is waiting on that stylesheet too.
 *
 * The Buy Me a Coffee loader stays in Layout.astro's <body>: it is an external
 * script that reads its own `data-*` attributes off `document.currentScript`,
 * so it cannot become injected inline content.
 */

// starwind theme init (replaces @yamada-ui/core's getColorModeScript);
// runs before paint so the initial render already has the right color mode
const themeInitScript = `(function () {
  function initTheme() {
    var colorTheme = localStorage.getItem("colorTheme");
    var prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (!colorTheme || colorTheme === "system") {
      document.documentElement.classList.toggle("dark", prefersDark);
    } else {
      document.documentElement.classList.toggle("dark", colorTheme === "dark");
    }
  }
  initTheme();
  document.addEventListener("astro:after-swap", initTheme);
})();`;

// click handler for the code block copy button (src/lib/satteri-plugins.ts)
const copyToClipboardScript = `window.copyCodeToClipboard = async (button, codeContainer) => {
  if (button.textContent === "Copied") {
    return;
  }
  navigator.clipboard.writeText(codeContainer.textContent || "");
  button.classList.add("copied");
  button.textContent = "Copied!";
  await new Promise((resolve) => {
    setTimeout(() => {
      button.classList.remove("copied");
      button.textContent = "Copy";
      resolve("done");
    }, 1500);
  });
};`;

// the Buy Me a Coffee widget injects #bmc-wbtn into <body>, plus an
// unlabelled overlay div (click-outside-to-close target) that wraps
// #bmc-iframe and #bmc-close-btn; carry all of it over to the next document
// so the ClientRouter swap doesn't drop it (the widget script itself only
// ever runs once). Moving #bmc-iframe alone would detach it from the overlay
// and silently break both the outside-click close and the close button.
const bmcPersistScript = `document.addEventListener("astro:before-swap", (event) => {
  const wbtn = document.getElementById("bmc-wbtn");
  if (wbtn) event.newDocument.body.appendChild(wbtn);
  const overlay = document.getElementById("bmc-iframe")?.parentElement;
  if (overlay) event.newDocument.body.appendChild(overlay);
});`;

// the widget ships a close button (#bmc-close-btn) for the opened panel, but
// its own script only reveals it below the 480px breakpoint (relies on
// clicking outside the panel to close on wider screens); show/hide it on the
// widget's own open/close clicks so a close button is always available.
// This used to sit at the end of <body>, after the widget loader; from <head>
// the readyState guard takes the DOMContentLoaded branch instead of running
// immediately, which is when the widget's DOM exists either way.
const bmcCloseButtonScript = `function initBmcCloseButton() {
  const closeBtn = document.getElementById("bmc-close-btn");
  const wbtn = document.getElementById("bmc-wbtn");
  if (!closeBtn || !wbtn || closeBtn.dataset.closeButtonWired) return;
  closeBtn.dataset.closeButtonWired = "true";
  const overlay = closeBtn.parentElement;
  wbtn.addEventListener("click", () => {
    closeBtn.style.visibility = "visible";
  });
  overlay.addEventListener("click", () => {
    closeBtn.style.visibility = "hidden";
  });
}
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initBmcCloseButton);
} else {
  initBmcCloseButton();
}
document.addEventListener("astro:page-load", initBmcCloseButton);`;

const gtagId = "G-F1N7VJ0ZX9";

// gtag.js measures the page as soon as it evaluates (it reads document/viewport
// geometry to set up scroll tracking). Loading it with `async` from <head>
// meant that read landed while the document was still being parsed and styled,
// so it forced a synchronous layout of the whole page -- ~70ms of the "forced
// reflow" the DevTools performance panel reports.
//
// Only the dataLayer queue below has to run early: gtag() just pushes onto an
// array and gtag.js replays whatever is queued the moment it arrives, so the
// hit timestamps (`gtag('js', new Date())`) stay accurate no matter when the
// library shows up. That lets the library itself wait until the page has
// painted and the main thread goes idle, when layout is already clean and the
// same measurement costs nothing.
//
// astro:after-swap fires on ClientRouter navigations only (not the initial
// load, which gtag('config') already reports), after the new <title> is set.
const gtagInit = `window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', '${gtagId}');
document.addEventListener('astro:after-swap', function () {
  gtag('event', 'page_view', { page_location: location.href, page_title: document.title });
});
(function () {
  function load() {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=${gtagId}';
    document.head.appendChild(script);
  }
  function schedule() {
    // the timeout bounds the wait on a main thread that never actually idles
    if (window.requestIdleCallback) requestIdleCallback(load, { timeout: 2000 });
    else setTimeout(load, 500);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();`;

export const inlineScripts = (): AstroIntegration => {
  return {
    name: "inline-scripts",
    hooks: {
      "astro:config:setup": async ({ command, injectScript }) => {
        // Injected content never reaches Vite, so these ship to every page
        // exactly as written above -- ~2.8kB of indentation and comments per
        // page. Minify them here instead, on builds only, so `astro dev` still
        // steps through the source (which is also when `?inline` stylesheets
        // stay unminified).
        const inject =
          command === "build"
            ? async (code: string) =>
                injectScript(
                  "head-inline",
                  (await transformWithEsbuild(code, "inline-script.js", { minify: true })).code
                )
            : async (code: string) => injectScript("head-inline", code);

        // theme first: it is the only one that has to beat the first paint
        await inject(themeInitScript);
        await inject(copyToClipboardScript);
        await inject(bmcPersistScript);
        await inject(bmcCloseButtonScript);
        // gatsby-plugin-google-gtag (head: true, production only). Injected
        // content is not processed by Vite, so `import.meta.env.PROD` would
        // survive into the browser as-is; gate on the command instead.
        if (command === "build") {
          await inject(gtagInit);
        }
      },
    },
  };
};
