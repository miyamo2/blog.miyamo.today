import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import algoliaIndex from "./integrations/algolia-index";

// https://astro.build/config
export default defineConfig({
  site: "https://blog.miyamo.today",
  // keep the same cache directory as the previous Gatsby setup so the CI cache step keeps working
  cacheDir: "./.cache",
  integrations: [react(), sitemap(), algoliaIndex()],
  image: {
    // article thumbnails / body images / GitHub avatar are all remote
    remotePatterns: [{ protocol: "https" }, { protocol: "http" }],
  },
  devToolbar: {
    enabled: false,
  },
});
