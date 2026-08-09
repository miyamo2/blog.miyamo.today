import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

/**
 * The four UDEVGothic faces are 1.26MB of woff2 -- more than everything else
 * the site ships put together. On the 1.6Mb/s link PageSpeed Insights emulates
 * that is seconds of the same connection the LCP image needs, and the mobile
 * run's simulated LCP (5.0s) was essentially the whole payload divided by the
 * bandwidth.
 *
 * Nothing about a static site requires shipping the whole face, though: every
 * character it can paint is already sitting in the repository when the build
 * starts. This module works out that character set; the integration next to it
 * cuts each face down to it (~300KB becomes ~30-70KB, pixel-for-pixel identical
 * because it is the same font).
 *
 * What the repository does not contain is covered two ways:
 *
 * - BASE_GLYPHS is in every subset regardless of what the sources use, so
 *   ascii, kana and the usual punctuation are always there -- that is what a
 *   reader types into the search box.
 * - the full faces stay declared as a second family behind the subset one
 *   ("UDEVGothicHS", "UDEVGothicHSFull", see BaseHead). A character the subset
 *   lacks falls through to it by ordinary font fallback, which fetches the full
 *   face at that moment and never before. Comments are outside all of this:
 *   giscus renders in its own cross-origin iframe, which this site's @font-face
 *   has never reached.
 */
export const FACES = [
  { file: "UDEVGothic35HS-Regular-Subset", style: "normal", weight: "normal" },
  { file: "UDEVGothic35HS-Bold-Subset", style: "normal", weight: "bold" },
  { file: "UDEVGothic35HS-Italic-Subset", style: "italic", weight: "normal" },
  { file: "UDEVGothic35HS-BoldItalic-Subset", style: "italic", weight: "bold" },
] as const;

export type Face = (typeof FACES)[number];

const range = (from: number, to: number): number[] =>
  [...Array(to - from + 1)].map((_, i) => from + i);

/** what a subset carries even if nothing in the sources uses it (see above) */
const BASE_GLYPHS = [
  // printable ascii
  ...range(0x20, 0x7e),
  // cjk punctuation, hiragana, katakana
  ...range(0x3000, 0x30ff),
  // fullwidth forms: fullwidth latin and digits, halfwidth katakana
  ...range(0xff00, 0xffef),
].map((code) => String.fromCodePoint(code));

/**
 * Where the text comes from. `src/content/blogapi` is the articles as the
 * loader wrote them, and the rest is the ui's own labels -- between them, every
 * string any page can render. `src/assets` is deliberately absent: it holds the
 * downloaded thumbnails, which are megabytes of binary with no text in them.
 */
const SOURCE_ROOT = resolve(process.cwd(), "src");
const CONTENT_ROOT = join(SOURCE_ROOT, "content");
const ASSET_ROOT = join(SOURCE_ROOT, "assets");

/** what the ui is written in; nothing else under src/ carries text to paint */
const SOURCE_EXTENSIONS = new Set([".astro", ".ts", ".tsx", ".js", ".css", ".json", ".md", ".mdx"]);
/** the loader chooses its own layout under src/content, so read all but these */
const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".woff2"]);

const readable = (dir: string, name: string): boolean =>
  dir.startsWith(CONTENT_ROOT)
    ? !BINARY_EXTENSIONS.has(extname(name))
    : SOURCE_EXTENSIONS.has(extname(name));

const walk = (dir: string, seen: Set<string>): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path !== ASSET_ROOT) {
        walk(path, seen);
      }
      continue;
    }
    if (!readable(dir, entry.name)) {
      continue;
    }
    for (const char of readFileSync(path, "utf8")) {
      seen.add(char);
    }
  }
};

let cached: { text: string; hash: string } | undefined;

/**
 * Every character the built site can paint, and a digest of it.
 *
 * Read once per process: the page build asks for the urls while it renders and
 * the integration asks again when it writes the files, and both have to agree.
 * Sorting before hashing keeps the digest a function of the character *set*,
 * not of the order the files happened to be walked in.
 */
const collect = (): { text: string; hash: string } => {
  if (!cached) {
    const seen = new Set(BASE_GLYPHS);
    walk(SOURCE_ROOT, seen);
    const text = [...seen].sort().join("");
    cached = { text, hash: createHash("sha256").update(text).digest("hex").slice(0, 8) };
  }
  return cached;
};

export const corpus = (): string => collect().text;

/**
 * The subset's filename, carrying a digest of the characters that went into it.
 *
 * The deploy serves everything under /fonts as immutable for a year (see
 * .github/workflows/publish.yaml), which is a promise that a given name always
 * means the same bytes. A subset's bytes change whenever the site's text does,
 * so the name has to change with them -- otherwise every returning reader keeps
 * last month's glyph set until the year is out. The pages that reference this
 * are revalidated on every request, so a new digest reaches readers with the
 * deploy that produces it.
 */
export const subsetFileName = (face: Face): string => `${face.file}.${collect().hash}.woff2`;

export const subsetHref = (face: Face): string => `/fonts/${subsetFileName(face)}`;

/** the untouched face, as shipped in public/fonts */
export const fullHref = (face: Face): string => `/fonts/${face.file}.woff2`;
