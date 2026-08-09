import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

/**
 * The four UDEVGothic faces are 1.26MB of woff2 -- more than everything else
 * the site ships put together. On the 1.6Mb/s link PageSpeed Insights emulates
 * that is seconds of the same connection the LCP image needs, and the mobile
 * run's simulated LCP (5.0s) was essentially the whole payload divided by the
 * bandwidth.
 *
 * A static site never needs the whole face, though: when the build finishes,
 * every character it can paint is sitting in the output. This module works out
 * that character set; the integration next to it cuts each face down to it
 * (~300KB becomes ~30-70KB, pixel-for-pixel identical because it is the same
 * font).
 *
 * Text the output does not contain is covered two ways:
 *
 * - BASE_GLYPHS is in every subset regardless of what the pages use, so ascii,
 *   kana and the usual punctuation are always there -- that is what a reader
 *   types into the search box.
 * - the complete faces are declared as a second family, "UDEVGothicHSFull",
 *   which styles/global.css puts behind this one on the search input alone.
 *   Site-wide it would be a liability rather than a safety net: every rendered
 *   character is in the corpus by construction, so the only thing that could
 *   fall through is a character the source face never had -- U+2014 is one --
 *   and the fallback would fetch 300KB to end up in the system font regardless.
 *
 * Comments are outside all of this: giscus renders in its own cross-origin
 * iframe, which this site's @font-face has never reached.
 */
export const FACES = [
  { file: "UDEVGothic35HS-Regular-Subset", style: "normal", weight: "normal" },
  { file: "UDEVGothic35HS-Bold-Subset", style: "normal", weight: "bold" },
  { file: "UDEVGothic35HS-Italic-Subset", style: "italic", weight: "normal" },
  { file: "UDEVGothic35HS-BoldItalic-Subset", style: "italic", weight: "bold" },
] as const;

export type Face = (typeof FACES)[number];

/**
 * What the @font-face rules carry until the digest is known.
 *
 * A subset is named after the characters in it, and those are only settled once
 * every page has been rendered -- after the head that has to point at the file.
 * So the pages go out with this in place of the digest and the build swaps it
 * in, rather than the character set being guessed early from the sources: a
 * page can render text that is in no source file (the GitHub profile on
 * /about), and content the loader has not written yet would simply be missed.
 */
export const DIGEST_TOKEN = "__FONT_SUBSET_DIGEST__";

const range = (from: number, to: number): number[] =>
  [...Array(to - from + 1)].map((_, i) => from + i);

/** what a subset carries even if no page happens to use it (see above) */
const BASE_GLYPHS = [
  // printable ascii
  ...range(0x20, 0x7e),
  // cjk punctuation, hiragana, katakana
  ...range(0x3000, 0x30ff),
  // fullwidth forms: fullwidth latin and digits, halfwidth katakana
  ...range(0xff00, 0xffef),
].map((code) => String.fromCodePoint(code));

/**
 * Every character the built site can paint.
 *
 * Whole files are read rather than just their text nodes: markup, json-ld and
 * meta descriptions are ascii or text the page shows anyway, so over-collecting
 * costs nothing (a character is counted once) and under-collecting would leave
 * something the pages do render outside the subset. The client bundles are here
 * for the same reason -- the search panel's own labels live in js, not in any
 * page's html.
 */
export const collectCorpus = async (
  outDir: string
): Promise<{ text: string; htmlFiles: string[] }> => {
  const chars = new Set<string>(BASE_GLYPHS);
  const htmlFiles: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      const extension = extname(entry.name);
      if (extension !== ".html" && extension !== ".js") {
        continue;
      }
      if (extension === ".html") {
        htmlFiles.push(path);
      }
      for (const char of await readFile(path, "utf8")) {
        chars.add(char);
      }
    }
  };

  await walk(outDir);
  // sorted so the digest is a function of the character *set*, not of the order
  // the files happened to be walked in
  return { text: [...chars].sort().join(""), htmlFiles };
};

/**
 * The digest a subset's filename carries.
 *
 * The deploy serves everything under /fonts as immutable for a year (see
 * .github/workflows/publish.yaml), which is a promise that a given name always
 * means the same bytes. A subset's bytes change whenever the site's text does,
 * so the name has to change with them -- otherwise every returning reader keeps
 * last month's glyph set until the year is out. The pages that reference it are
 * revalidated on every request, so a new digest reaches readers with the deploy
 * that produced it.
 */
export const digestOf = (corpus: string): string =>
  createHash("sha256").update(corpus).digest("hex").slice(0, 8);

export const subsetFileName = (face: Face, digest: string): string =>
  `${face.file}.${digest}.woff2`;

export const subsetHref = (face: Face, digest: string): string =>
  `/fonts/${subsetFileName(face, digest)}`;

/** the untouched face, as shipped in public/fonts */
export const fullHref = (face: Face): string => `/fonts/${face.file}.woff2`;
