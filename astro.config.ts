import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { blogApiMiyamoToday } from "@miyamo2/astro-loader-blogapi-miyamo-today";
import { imagePlaceholderService } from "@miyamo2/astro-image-placeholder";
import algoliaIndex from "./integrations/algolia-index";

// `.env` files are not loaded into process.env while the config itself is being
// evaluated, so load them explicitly here (empty prefix -> load every var).
const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");

// content.config.ts / integrations / src/lib read process.env directly, which Vite
// never populates from .env files — mirror the loaded vars there (real environment
// variables keep priority over file values).
for (const [key, value] of Object.entries(env)) {
  process.env[key] ??= value;
}

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
  integrations: [
    blogApiMiyamoToday({
      url: env.BLOG_API_MIYAMO_TODAY_URL ?? "",
      token: env.BLOG_API_MIYAMO_TODAY_TOKEN ?? "",
    }),
    sitemap(),
    algoliaIndex(),
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
    // adds the blurred placeholder to every getImage() result as
    // `data-placeholder`, and caches remote image metadata under
    // .cache/remote-image-meta (kept by the CI cache step)
    service: imagePlaceholderService,
    // article thumbnails / body images / GitHub avatar are all remote
    remotePatterns: [{ protocol: "https" }, { protocol: "http" }],
  },
  devToolbar: {
    enabled: false,
  },
});
