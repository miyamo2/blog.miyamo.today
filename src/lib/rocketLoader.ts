import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";

/**
 * Cloudflare Rocket Loader rewrites every <script> it is allowed to touch into a
 * `type="text/rocketscript"` tag and runs it from its own scheduler. That survives a
 * full page load, but <ClientRouter /> only re-executes a swapped-in script when its
 * type is `module` or `text/javascript` (see runScripts() in astro's
 * dist/transitions/router.js), so a rewritten script that first appears on a
 * client-side navigation is skipped and never runs at all.
 *
 * Scripts that already ran on the entry page keep working (they live on in memory),
 * which is why only page-specific ones break: e.g. the TOC modal opens -- Dialog's
 * script ships on every page through the header -- but never closes on selection,
 * because TOCModal's own script only exists on article pages.
 *
 * `data-cfasync="false"` is Rocket Loader's opt-out; Layout.astro already sets it by
 * hand on the scripts it controls. Astro generates the rest, so stamp them here.
 */
const CFASYNC = ' data-cfasync="false"';

/** matches an opening <script> tag that does not already carry data-cfasync */
const SCRIPT_TAG = /<script(?![^>]*\sdata-cfasync=)([^>]*)>/gi;

const htmlFilesIn = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return htmlFilesIn(full);
      }
      return entry.name.endsWith(".html") ? [full] : [];
    })
  );
  return files.flat();
};

export const excludeScriptsFromRocketLoader = (): AstroIntegration => ({
  name: "exclude-scripts-from-rocket-loader",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      const files = await htmlFilesIn(fileURLToPath(dir));
      let stamped = 0;
      await Promise.all(
        files.map(async (file) => {
          const html = await readFile(file, "utf8");
          const next = html.replace(SCRIPT_TAG, (_, attrs: string) => {
            stamped++;
            return `<script${CFASYNC}${attrs}>`;
          });
          if (next !== html) {
            await writeFile(file, next);
          }
        })
      );
      logger.info(`added data-cfasync="false" to ${stamped} script tags`);
    },
  },
});
