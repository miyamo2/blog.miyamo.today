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
import jsonld from "@miyamo2/astro-jsonld";
import { remoteImageStaging } from "./integrations/remote-image-staging";
import { inlineScripts } from "./integrations/inline-scripts";
import { deferredScripts } from "./integrations/deferred-scripts";
import { lastmodSerializer } from "./integrations/sitemap-lastmod";
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

// astro's `site` and the JSON-LD `@id`s are built from the same pieces, so a
// reference to the author resolves to the node the integration emits.
const SITE_URL = "https://blog.miyamo.today";
const AUTHOR_PATH = "/about";
const AUTHOR_FRAGMENT = "#person";
const AUTHOR_ID = `${SITE_URL}${AUTHOR_PATH}${AUTHOR_FRAGMENT}`;

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
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
  // a build keeps its content layer store, its generated images and the remote
  // originals staged-remote-image.ts downloads under `cacheDir`. Astro defaults
  // it to node_modules/.astro, which `bun install` is free to wipe -- moving it
  // out gives CI one directory to restore that survives the install step.
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
    deferredScripts(),
    // The site's JSON-LD identity, and the single source for the site's name,
    // description and url -- src/lib/site.ts reads them back off the resolved
    // config. `siteUrl`, `base` and `trailingSlash` are left to astro's own
    // settings above.
    jsonld({
      name: "blog.miyamo.today",
      alternateName: "blog miyamo today",
      description:
        "miyamo2のブログ。体験したこと、考えていること、それとコードの断片をゆるく発信していきます。",
      inLanguage: "ja",
      author: {
        name: "miyamo2",
        url: AUTHOR_PATH,
        id: AUTHOR_FRAGMENT,
        jobTitle: "Software Engineer",
        // the fields below `sameAs` reach a node where miyamo2 is the subject:
        // the ProfilePage's mainEntity, and the top-level Person from `siteNodes`
        disambiguatingDescription: "Goが好きなソフトウェアエンジニア。GitHub: @miyamo2",
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
      // one person writes this blog and one person publishes it, so the two
      // credits are one entity under one `@id`
      publisher: "author",
      // the search panel writes its query onto the current url, so the site
      // root doubles as the search endpoint (see components/search/search.ts)
      searchAction: { target: "/?q={search_term_string}" },
      website: {
        copyrightYear: 2024,
        // a reference, so the Person `siteNodes` emits is the one definition
        // in the document
        publisher: { "@id": AUTHOR_ID },
      },
      // the full Person as a node in its own right, which is what a
      // knowledge-panel entity is read from
      siteNodes: { website: true, author: true },
      // one <script> per page, holding one @graph
      graph: true,
    }),
    blogApiMiyamoToday({
      url: env.BLOG_API_MIYAMO_TODAY_URL ?? "",
      token: env.BLOG_API_MIYAMO_TODAY_TOKEN ?? "",
    }),
    sitemap({
      // /pages/1 and /tags/{tag}/1 are 301s to / and /tags/{tag} (the routes
      // redirect themselves), so listing them only earns one "page with
      // redirect" per tag in Search Console
      filter: (page) => !/\/(?:pages|tags\/[^/]+)\/1\/?$/.test(new URL(page).pathname),
      // without this every <url> is a bare <loc> and nothing tells a crawler
      // an article was edited
      serialize: lastmodSerializer(),
    }),
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
