/**
 * Loads the starwind dialog handler (`./dialog`) on the first sign that someone
 * is reaching for a dialog -- the search button, the hamburger menu or the
 * article TOC button.
 *
 * The handler used to be Dialog.astro's own `<script>`, which made it a module
 * chunk on the critical request chain of every page for a widget most visits
 * never open. Nothing needs it before a trigger is used, so it waits here
 * instead. integrations/deferred-scripts injects this module (see the comment
 * in Dialog.astro).
 */

const DIALOG_TRIGGER = ".starwind-dialog-trigger";

/** true once setupDialogs() has run, i.e. once the triggers open on their own */
let wired = false;
let handler: Promise<void> | null = null;

/**
 * Also the search panel's entry point: the panel drives the dialog it lives in
 * (it dispatches starwind's `dialog:open` on a `?q=` load and adopts an
 * already-open one), so ./search waits on this before it runs.
 */
export const loadDialogs = (): Promise<void> =>
  (handler ??= import("./dialog").then((module) => {
    module.setupDialogs();
    wired = true;
  }));

const triggerOf = (event: Event): Element | null =>
  event.target instanceof Element ? event.target.closest(DIALOG_TRIGGER) : null;

/** the `.starwind-dialog` a trigger belongs to, whether it sits inside one or targets it by id */
const dialogOf = (trigger: Element): Element | null => {
  const id = trigger.getAttribute("data-dialog-for");
  return id ? document.getElementById(id) : trigger.closest(".starwind-dialog");
};

const onIntent = (event: Event): void => {
  if (triggerOf(event)) void loadDialogs();
};

/*
 * Delegated from `document` so all of this survives ClientRouter navigations:
 * the listeners outlive every swap, and this module (like all bundled module
 * scripts) is evaluated once per full page load anyway.
 *
 * pointerover and focusin both land before the click that opens a dialog, so
 * the handler is usually wired by the time one is asked for.
 */
document.addEventListener("pointerover", onIntent, { passive: true });
document.addEventListener("focusin", onIntent);

/*
 * The fallback for input that reaches a trigger without either -- a tap, or a
 * click dispatched straight at it. The handler's own click listener does not
 * exist yet in that case, so the open has to be replayed once it does. Capture
 * phase, so `wired` is still answering for the click that is on its way to the
 * trigger.
 */
document.addEventListener(
  "click",
  (event) => {
    const trigger = triggerOf(event);
    if (!trigger) return;
    if (wired) return;
    const dialog = dialogOf(trigger);
    if (!dialog) return;
    // open() is a no-op on an already-open dialog, so racing the handler's own
    // listener here costs nothing
    void loadDialogs().then(() => dialog.dispatchEvent(new CustomEvent("dialog:open")));
  },
  { capture: true }
);
