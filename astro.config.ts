import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { blogApiMiyamoToday } from "@miyamo2/astro-loader-blogapi-miyamo-today";
import algoliaIndex from "./integrations/algolia-index";

// https://astro.build/config
export default defineConfig({
  site: "https://blog.miyamo.today",
  // keep the same cache directory as the previous Gatsby setup so the CI cache step keeps working
  cacheDir: "./.cache",
  integrations: [
    blogApiMiyamoToday({
      url: process.env.BLOG_API_MIYAMO_TODAY_URL ?? "",
      token: process.env.BLOG_API_MIYAMO_TODAY_TOKEN ?? "",
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
