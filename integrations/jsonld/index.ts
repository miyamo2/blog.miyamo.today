import type { AstroIntegration } from "astro";
import { JSONLD_CONFIG_MODULE_ID, type JsonLdConfig, type JsonLdOptions } from "./config";

export type { JsonLdOptions, JsonLdConfig };

/**
 * Serves the resolved config as `virtual:jsonld/config`.
 *
 * The config is plain data, so the module body is just its JSON literal --
 * that keeps the site's identity (name, author, publisher, logo) declared once
 * in astro.config.ts and out of the builders, which is what makes those
 * builders reusable outside this repository.
 */
const virtualConfigPlugin = (config: JsonLdConfig) => {
  // \0 marks the id as virtual, so no other plugin tries to read it off disk
  const resolvedId = `\0${JSONLD_CONFIG_MODULE_ID}`;
  return {
    name: "jsonld-config",
    resolveId: (id: string) => (id === JSONLD_CONFIG_MODULE_ID ? resolvedId : undefined),
    load: (id: string) =>
      id === resolvedId ? `export const jsonLdConfig = ${JSON.stringify(config)};` : undefined,
  };
};

/**
 * Publishes the site-level JSON-LD identity to integrations/jsonld/builder,
 * which the pages build their per-page nodes with.
 *
 * The site-wide WebSite node is not a page's business either: BaseHead.astro
 * asks the builder for it (`globalJSONLD`) and emits it everywhere, so no page
 * has to remember to include it.
 */
export const jsonld = (options: JsonLdOptions): AstroIntegration => {
  return {
    name: "jsonld",
    hooks: {
      "astro:config:setup": ({ config, updateConfig }) => {
        // absoluteUrl() glues paths straight onto this, so a trailing slash
        // would produce "https://host//articles/x"
        const siteUrl = (options.siteUrl ?? config.site ?? "").replace(/\/+$/, "");
        if (!siteUrl) {
          throw new Error(
            "jsonld: no site url. Set `site` in astro.config.ts, or pass `siteUrl` to jsonld()."
          );
        }
        updateConfig({ vite: { plugins: [virtualConfigPlugin({ ...options, siteUrl })] } });
      },
    },
  };
};
