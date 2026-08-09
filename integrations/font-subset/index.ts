import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import subsetFont from "subset-font";
import { FACES, corpus, fullHref, subsetFileName, subsetHref, type Face } from "./corpus";

/**
 * Cuts each UDEVGothic face down to the characters the site can paint, and
 * hands the page the @font-face rules that point at the result.
 *
 * Both halves have to name the same file, and a subset's name carries a digest
 * of the characters that produced it (see ./corpus) -- so the name is not
 * something a hand-written stylesheet could hold. That is why the css comes
 * from here too, as `virtual:font-subset`, rather than the filename being
 * repeated somewhere a later edit could leave behind: one module decides it,
 * the build writes the bytes under it, and BaseHead only prints what it is
 * given.
 */
const VIRTUAL_ID = "virtual:font-subset";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

const sourcePath = (face: Face): string =>
  resolve(process.cwd(), "public/fonts", `${face.file}.woff2`);

const fontFace = (family: string, src: string, face: Face): string =>
  `@font-face{font-family:"${family}";font-display:swap;font-style:${face.style};` +
  `font-weight:${face.weight};font-named-instance:"UDEVGothicHS";` +
  `src:url(${src}) format("woff2")}`;

/**
 * Every face declared twice: once as "UDEVGothicHS" from the subset, once as
 * "UDEVGothicHSFull" from the complete file. styles/global.css stacks them in
 * that order, so a character the subset lacks reaches the full face by ordinary
 * font fallback -- fetched at that point and not during the load.
 */
const fontFaceCss = (): string =>
  FACES.map(
    (face) =>
      fontFace("UDEVGothicHS", subsetHref(face), face) +
      fontFace("UDEVGothicHSFull", fullHref(face), face)
  ).join("");

const kib = (bytes: number): string => `${(bytes / 1024).toFixed(1)}KiB`;

export const fontSubset = (): AstroIntegration => ({
  name: "font-subset",
  hooks: {
    "astro:config:setup": ({ updateConfig }) => {
      updateConfig({
        vite: {
          plugins: [
            {
              name: "font-subset-virtual",
              resolveId: (id: string) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
              load: (id: string) =>
                id === RESOLVED_ID ? `export default ${JSON.stringify(fontFaceCss())};` : undefined,
            },
          ],
        },
      });
    },

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
