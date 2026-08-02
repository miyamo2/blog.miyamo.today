import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { blogApiMiyamoToday } from "@miyamo2/astro-loader-blogapi-miyamo-today";
import algoliaIndex from "./integrations/algolia-index";

// `.env` files are not loaded into process.env while the config itself is being
// evaluated, so load them explicitly here (empty prefix -> load every var).
const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  site: "https://blog.miyamo.today",
  // keep the same cache directory as the previous Gatsby setup so the CI cache step keeps working
  cacheDir: "./.cache",
  integrations: [
    blogApiMiyamoToday({
      url: env.BLOG_API_MIYAMO_TODAY_URL ?? "",
      token: env.BLOG_API_MIYAMO_TODAY_TOKEN ?? "",
    }),
    react(),
    sitemap(),
    algoliaIndex(),
  ],
  image: {
    // article thumbnails / body images / GitHub avatar are all remote
    remotePatterns: [{ protocol: "https" }, { protocol: "http" }],
  },
  devToolbar: {
    enabled: false,
  },
});
