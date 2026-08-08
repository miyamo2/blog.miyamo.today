import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { publishRemoteImageDirectories } from "./env";

/**
 * Publishes the build output / cache / assets directories to
 * src/lib/staged-remote-image.ts, which downloads every remote image (article
 * bodies and link cards alike) itself and stages it in the build output for
 * astro:assets to pick up as a local image -- keeping astro's own
 * image-generation phase, where a failure aborts the whole build, off the
 * network.
 *
 * Only a real build publishes them: `astro dev` has no build output to stage
 * into and resolves remote images per request instead, where a failure costs
 * one image rather than the build.
 */
export const remoteImageStaging = (): AstroIntegration => {
  let isBuild = false;
  return {
    name: "remote-image-staging",
    hooks: {
      "astro:config:setup": ({ command }) => {
        isBuild = command === "build";
      },
      "astro:config:done": ({ config }) => {
        if (!isBuild) {
          return;
        }
        publishRemoteImageDirectories({
          outDir: fileURLToPath(config.outDir),
          cacheDir: fileURLToPath(config.cacheDir),
          assetsDir: config.build.assets,
        });
      },
    },
  };
};
