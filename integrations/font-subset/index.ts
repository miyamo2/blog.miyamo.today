import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import subsetFont from "subset-font";
import { FACES, corpus, subsetFileName, type Face } from "./corpus";

/**
 * Writes the subset faces `corpus.ts` describes into the build output.
 *
 * The character set -- and so each subset's filename -- is derived from the
 * sources, not from the generated pages, so BaseHead can already name the file
 * while it renders the @font-face rules. This hook only produces the bytes.
 */
const sourcePath = (face: Face): string =>
  resolve(process.cwd(), "public/fonts", `${face.file}.woff2`);

const kib = (bytes: number): string => `${(bytes / 1024).toFixed(1)}KiB`;

export const fontSubset = (): AstroIntegration => ({
  name: "font-subset",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      const fontsDir = join(fileURLToPath(dir), "fonts");
      const text = corpus();
      await mkdir(fontsDir, { recursive: true });

      for (const face of FACES) {
        const source = await readFile(sourcePath(face));
        const subset = await subsetFont(source, text, { targetFormat: "woff2" });
        await writeFile(join(fontsDir, subsetFileName(face)), subset);
        logger.info(`${face.file}: ${kib(source.length)} -> ${kib(subset.length)}`);
      }
    },

    /**
     * `astro dev` never runs the hook above, so the subsets do not exist there.
     * Answering their urls with the full face keeps the dev server from 404ing
     * on every font: the pages get the same glyphs, just all of them.
     */
    "astro:server:setup": ({ server }) => {
      server.middlewares.use((req, res, next) => {
        const face = FACES.find((candidate) => req.url?.endsWith(subsetFileName(candidate)));
        if (!face) {
          next();
          return;
        }
        readFile(sourcePath(face)).then(
          (font) => {
            res.setHeader("Content-Type", "font/woff2");
            res.end(font);
          },
          () => next()
        );
      });
    },
  },
});
