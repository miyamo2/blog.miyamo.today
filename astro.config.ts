import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import pLimit from "p-limit";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriLinkCard } from "satteri-link-card";
import { blogApiMiyamoToday } from "@miyamo2/astro-loader-blogapi-miyamo-today";
import algoliaIndex from "@miyamo2/astro-algolia-index";
import { imagePlaceholderService } from "@miyamo2/astro-image-placeholder";
import { remoteImageStaging } from "./integrations/remote-image-staging";
import { inlineScripts } from "./integrations/inline-scripts";
import { jsonld } from "./integrations/jsonld";
import {
  headingAnchorPlugin,
  plainTextMdastPlugin,
  codeCopyButtonPlugin,
  remoteImagesMdastPlugin,
} from "./src/lib/satteri-plugins";

// `.env` files are not loaded into process.env while the config itself is being
// evaluated, so load them explicitly here (empty prefix -> load every var).
const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");

// content.config.ts / integrations / src/lib read process.env directly, which Vite
// never populates from .env files — mirror the loaded vars there (real environment
// variables keep priority over file values).
for (const [key, value] of Object.entries(env)) {
  process.env[key] ??= value;
}

// satteri's renderer never resolves some of its render() calls when several
// run concurrently (Astro's glob loader renders every entry in parallel via
// Promise.all) -- serializing them works around it at the cost of dev/build
// startup time.
const serializeRenders = (processor: ReturnType<typeof satteri>): typeof processor => {
  const limit = pLimit(1);
  return {
    ...processor,
    async createRenderer(shared) {
      const renderer = await processor.createRenderer(shared);
      return {
        ...renderer,
        render: (content, renderOpts) => limit(() => renderer.render(content, renderOpts)),
      };
    },
  };
};

// https://astro.build/config
export default defineConfig({
  site: "https://blog.miyamo.today",
  env: {
    schema: {
      PUBLIC_ALGOLIA_APP_ID: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "",
      }),
      PUBLIC_ALGOLIA_SEARCH_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "",
      }),
      PUBLIC_ALGOLIA_INDEX_NAME: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "",
      }),
    },
  },
  // keep the same cache directory as the previous Gatsby setup so the CI cache step keeps working
  cacheDir: "./.cache",
  markdown: {
    // same look as the previous prism-dracula theme; satteri()'s own options
    // don't include shikiConfig -- it's read from this top-level key instead
    shikiConfig: { theme: "dracula" },
    processor: serializeRenders(
      satteri({
        // heading-anchor must run before satteri's built-in heading-ids plugin
        // (fixed order: [highlight, ...hastPlugins, image-marker, heading-ids])
        // so it can assign the id itself; heading-ids then reuses it as-is.
        hastPlugins: [
          headingAnchorPlugin,
          codeCopyButtonPlugin,
          // same options as the previous remark-link-card-plus config
          satteriLinkCard({ metadataCache: false, shortenUrl: true, thumbnail: { position: "right" } }),
        ],
        mdastPlugins: [remoteImagesMdastPlugin, plainTextMdastPlugin],
      }),
    ),
  },
  integrations: [
    remoteImageStaging(),
    inlineScripts(),
    // The site's JSON-LD identity. `siteUrl` is left to astro's own `site`
    // above; everything else used to be hard-coded in src/lib/jsonld.ts.
    jsonld({
      name: "blog.miyamo.today",
      alternateName: "blog miyamo today",
      author: {
        name: "miyamo2",
        path: "/about",
        sameAs: [
          "https://github.com/miyamo2",
          "https://zenn.dev/miyamo2",
          "https://twitter.com/miyamo2_jp",
          "https://speakerdeck.com/miyamo2",
          "https://qiita.com/miyamo2",
          "https://connpass.com/user/miyamo2/",
          "https://medium.com/@miyamo2",
          "https://dev.to/miyamo2",
          "https://note.com/miyamo2",
          "https://www.npmjs.com/~miyamo2",
          "https://pypi.org/user/miyamo2theppl/",
        ],
      },
      publisher: {
        name: "blog.miyamo.today",
        path: "/",
        logo: { path: "/logo.png", width: 65, height: 65 },
      },
    }),
    blogApiMiyamoToday({
      url: env.BLOG_API_MIYAMO_TODAY_URL ?? "",
      token: env.BLOG_API_MIYAMO_TODAY_TOKEN ?? "",
    }),
    sitemap(),
    algoliaIndex({
      appId: env.PUBLIC_ALGOLIA_APP_ID,
      apiKey: env.ALGOLIA_ADMIN_KEY,
      indexName: env.PUBLIC_ALGOLIA_INDEX_NAME,
      settings: {
        searchableAttributes: ["title", "content", "tags"],
        indexLanguages: ["ja"],
        queryLanguages: ["ja"],
        attributesToSnippet: ["content:10"],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // one stylesheet for every page: per-page chunks duplicated the tailwind
      // utilities and broke the cascade (`hidden` re-appearing after `lg:block`)
      cssCodeSplit: false,
    },
  },
  image: {
    service: imagePlaceholderService,
    // article thumbnails / body images / GitHub avatar are all remote
    remotePatterns: [{ protocol: "https" }, { protocol: "http" }],
  },
  devToolbar: {
    enabled: false,
  },
});
