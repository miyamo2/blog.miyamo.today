import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import subsetFont from "subset-font";
import {
  DIGEST_TOKEN,
  FACES,
  collectCorpus,
  digestOf,
  fullHref,
  subsetFileName,
  subsetHref,
  type Face,
} from "./corpus";

/**
 * Cuts each UDEVGothic face down to the characters the built site can paint,
 * and hands the pages the @font-face rules that point at the result.
 *
 * Both halves have to name the same file, and the name carries a digest of
 * those characters (see ./corpus) -- which is only known once every page has
 * been rendered, i.e. after the head that points at it. So the css comes from
 * here too, as `virtual:font-subset`, carrying DIGEST_TOKEN where the digest
 * goes; this hook reads the pages back, subsets the faces to what it finds,
 * and writes the digest into the pages it just read.
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
 * "UDEVGothicHSFull" from the complete file. Declaring a face fetches nothing;
 * styles/global.css decides where each family is used, and the full one is
 * reached from the search input alone (see ./corpus).
 */
const fontFaceCss = (): string =>
  FACES.map(
    (face) =>
      fontFace("UDEVGothicHS", subsetHref(face, DIGEST_TOKEN), face) +
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
      const outDir = fileURLToPath(dir);
      const { text, htmlFiles } = await collectCorpus(outDir);
      const digest = digestOf(text);

      await mkdir(join(outDir, "fonts"), { recursive: true });
      for (const face of FACES) {
        const source = await readFile(sourcePath(face));
        const subset = await subsetFont(source, text, { targetFormat: "woff2" });
        await writeFile(join(outDir, "fonts", subsetFileName(face, digest)), subset);
        logger.info(`${face.file}: ${kib(source.length)} -> ${kib(subset.length)}`);
      }

      let stamped = 0;
      for (const path of htmlFiles) {
        const html = await readFile(path, "utf8");
        if (!html.includes(DIGEST_TOKEN)) {
          continue;
        }
        await writeFile(path, html.replaceAll(DIGEST_TOKEN, digest));
        stamped += 1;
      }
      logger.info(`${digest}: ${stamped} page(s) point at this subset`);
    },

    /**
     * `astro dev` never runs the hook above, so no subset exists there and the
     * pages still carry DIGEST_TOKEN. Answering whatever they ask for with the
     * full face keeps the dev server from 404ing on every font: the pages get
     * the same glyphs, just all of them.
     */
    "astro:server:setup": ({ server }) => {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        const face = FACES.find(
          (candidate) =>
            url.startsWith(`/fonts/${candidate.file}.`) &&
            url.endsWith(".woff2") &&
            url !== fullHref(candidate)
        );
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
