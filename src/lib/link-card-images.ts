import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getImage } from "astro:assets";
import { escapeHtml } from "@miyamo2/astro-image-placeholder";
import pLimit from "p-limit";

// satteri-link-card emits the OGP image / favicon URLs it scraped verbatim (its
// own `imageCache` only self-hosts the original bytes, it never resizes), so a
// 1200x600 og:image lands in a box that is never wider than ~273 CSS px and a
// 512x512 favicon in a 14x14 one -- PageSpeed Insights' "Improve image
// delivery". These constants describe those boxes; see
// `.satteri-link-card__media` / `__favicon` in styles/vendor.css.
const THUMBNAIL_WIDTH = 280;
const THUMBNAIL_HEIGHT = 140;
// 448w is the candidate lighthouse's mobile run asks for (412px viewport, 40vw
// slot, DPR 1.75); 560w covers the widest desktop box (273px) at DPR 2
const THUMBNAIL_WIDTHS = [160, 280, 448, 560];
// the media box is 40% of the card below 768px and 30% above it; the card is
// the content column, which stops growing at 1400px * 65% (article-detail.css)
const THUMBNAIL_SIZES = `(min-width: 1200px) ${THUMBNAIL_WIDTH}px, (min-width: 768px) 30vw, 40vw`;
const FAVICON_WIDTH = 14;
const FAVICON_WIDTHS = [14, 28];
const FAVICON_SIZES = `${FAVICON_WIDTH}px`;

const IMAGE_QUALITY = 80;

const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// re-fetching every build only costs us rate limits
// (opengraph.githubassets.com starts answering 429 well before a full build's
// worth of requests is through). The TTL is also what eventually stops us
// serving an image whose source has been taken down: once it expires, a
// re-fetch that fails drops the card back to the origin's own URL.
const ORIGINAL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// astro's image service refuses SVG unless `image.dangerouslyProcessSVG` is on,
// and sharp cannot decode .ico at all. Either one reaching getImage() aborts
// the *whole build* from the "generating optimized images" phase (astro
// rethrows every asset-generation error), so the format is checked against the
// bytes we downloaded -- not against the URL, which lies often enough.
const DECODABLE_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif", "tiff"]);

const EXTENSIONS: Record<string, string> = { jpeg: "jpg" };

/**
 * Assets folder of the build output. The originals are staged there so the
 * variants astro derives from them land next to every other hashed asset --
 * the deploy step uploads `dist/_astro` first and as `immutable` (see
 * .github/workflows/publish.yaml), which is exactly what these are.
 */
const ASSETS_DIR = (): string => process.env.LINK_CARD_IMAGE_ASSETS_DIR || "_astro";

type Kind = "image" | "favicon";

interface StagedImage {
  /** path relative to the build output root, which is how astro:assets addresses it */
  src: string;
  fsPath: string;
  width: number;
  height: number;
  format: string;
}

interface OptimizedImage {
  src: string;
  srcSet?: string;
  sizes: string;
}

/**
 * Build output / cache directories, published by the `link-card-images`
 * integration in astro.config.ts. Page rendering and the astro config live in
 * separate module graphs, so process.env is the only channel between them;
 * their absence means "not a production build", and optimization is skipped
 * (`astro dev` has no build output to stage originals into).
 */
const outDir = (): string | undefined => process.env.LINK_CARD_IMAGE_OUT_DIR || undefined;
const cacheDir = (): string | undefined => process.env.LINK_CARD_IMAGE_CACHE_DIR || undefined;

const keyFor = (url: string): string => createHash("sha1").update(url).digest("hex").slice(0, 16);

const fetchImageBytes = async (url: string): Promise<Buffer | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { accept: "image/*" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length > 0 && bytes.length <= MAX_IMAGE_BYTES ? bytes : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const downloadOriginal = async (url: string): Promise<Buffer | null> => {
  const cache = cacheDir();
  const cacheFile = cache ? join(cache, "link-card-images", keyFor(url)) : undefined;
  if (cacheFile) {
    try {
      const info = await stat(cacheFile);
      if (Date.now() - info.mtimeMs < ORIGINAL_CACHE_TTL_MS) {
        return await readFile(cacheFile);
      }
    } catch {
      // not cached yet (or unreadable) -- fall through to the network
    }
  }
  const bytes = await fetchImageBytes(url);
  if (!bytes) {
    return null;
  }
  if (cacheFile) {
    try {
      await mkdir(dirname(cacheFile), { recursive: true });
      await writeFile(cacheFile, bytes);
    } catch {
      // caching is best-effort
    }
  }
  return bytes;
};

/**
 * Downloads one link card image and writes it into the build output, where
 * astro:assets reads a *local* image's bytes from.
 *
 * Handing astro the URL directly would be less code, but it defers the download
 * to astro's own generation phase -- and any failure there fails the *entire*
 * build, since astro rethrows every asset-generation error. These URLs are
 * scraped from live third-party pages: hosts go down, rate limit, and serve
 * formats sharp cannot read. Downloading here turns every one of those into a
 * `null` that leaves the original markup alone.
 *
 * The staged original is deleted again by astro once it has produced the
 * variants, since nothing else references it.
 */
const stageOriginal = async (url: string): Promise<StagedImage | null> => {
  const out = outDir();
  if (!out) {
    return null;
  }
  const bytes = await downloadOriginal(url);
  if (!bytes) {
    return null;
  }
  let format: string | undefined;
  let width: number | undefined;
  let height: number | undefined;
  try {
    const sharp = (await import("sharp")).default;
    ({ format, width, height } = await sharp(bytes).metadata());
  } catch {
    return null;
  }
  if (!format || !DECODABLE_FORMATS.has(format) || !width || !height) {
    return null;
  }
  const src = `/${ASSETS_DIR()}/${keyFor(url)}.${EXTENSIONS[format] ?? format}`;
  const fsPath = join(out, src);
  try {
    await mkdir(dirname(fsPath), { recursive: true });
    await writeFile(fsPath, bytes);
  } catch {
    return null;
  }
  return { src, fsPath, width, height, format };
};

const optimize = async (url: string, kind: Kind): Promise<OptimizedImage | null> => {
  const staged = await stageOriginal(url);
  if (!staged) {
    return null;
  }
  const isThumbnail = kind === "image";
  const targetWidth = isThumbnail ? THUMBNAIL_WIDTH : FAVICON_WIDTH;
  const targetHeight = isThumbnail
    ? THUMBNAIL_HEIGHT
    : // favicons are not always square; keep their aspect and let the CSS box crop
      Math.max(1, Math.round((FAVICON_WIDTH * staged.height) / staged.width));
  // never upscale past the source: those variants are bytes with no detail
  const widths = (isThumbnail ? THUMBNAIL_WIDTHS : FAVICON_WIDTHS).filter(
    (width) => width <= staged.width
  );
  try {
    const result = await getImage({
      src: {
        src: staged.src,
        fsPath: staged.fsPath,
        width: staged.width,
        height: staged.height,
        format: staged.format,
      } as Parameters<typeof getImage>[0]["src"],
      width: targetWidth,
      height: targetHeight,
      widths: widths.length > 0 ? widths : [Math.min(targetWidth, staged.width)],
      format: "webp",
      quality: IMAGE_QUALITY,
      // the thumbnail box is not exactly 2:1, so the source has to be cropped
      ...(isThumbnail ? { fit: "cover" as const } : {}),
    });
    return {
      src: result.src,
      srcSet: result.srcSet.attribute !== "" ? result.srcSet.attribute : undefined,
      sizes: isThumbnail ? THUMBNAIL_SIZES : FAVICON_SIZES,
    };
  } catch (e) {
    console.warn(`[link-card-images] failed to optimize ${url}: ${String(e)}`);
    return null;
  }
};

// one build meets the same og:image and (especially) the same favicon over and
// over -- articles link to the same hosts repeatedly. The concurrency cap keeps
// us from bursting a single host hard enough to be rate limited.
const inflight = new Map<string, Promise<OptimizedImage | null>>();
const limit = pLimit(4);

const optimizeOnce = (url: string, kind: Kind): Promise<OptimizedImage | null> => {
  const key = `${kind}:${url}`;
  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }
  const request = limit(() => optimize(url, kind));
  inflight.set(key, request);
  return request;
};

const LINK_CARD_IMG = /<img\b[^>]*\bclass="satteri-link-card__(image|favicon)"[^>]*>/g;
const SRC_ATTRIBUTE = /\ssrc="([^"]*)"/;

const decodeHtml = (value: string): string =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // last: an escaped entity must not be produced by an earlier replacement
    .replace(/&amp;/g, "&");

/** sets (or adds, keeping the tag's self-closing form) attributes on one tag */
const withAttributes = (tag: string, attributes: Record<string, string | undefined>): string => {
  let result = tag;
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined) {
      continue;
    }
    const attribute = ` ${name}="${value}"`;
    const existing = new RegExp(`\\s${name}="[^"]*"`);
    result = existing.test(result)
      ? result.replace(existing, () => attribute)
      : result.replace(/\s*\/?>$/, (close) => `${attribute}${close}`);
  }
  return result;
};

/**
 * Re-points the `<img>`s satteri-link-card rendered at responsive webp variants
 * sized for the card's actual box, which also moves the third-party thumbnails
 * onto our own origin. Anything that could not be optimized keeps its original
 * URL and only gains the `lazy` satteri-link-card omits on favicons.
 *
 * Rewriting the serialized HTML rather than the hast tree is deliberate, for
 * the same reason `replaceRemoteImagePlaceholders` (./images) exists: satteri's
 * hastPlugins -- where satteri-link-card builds these nodes -- run during
 * content-layer sync, where `getImage()` is not usable.
 */
export const optimizeLinkCardImages = async (html: string): Promise<string> => {
  const matches = [...html.matchAll(LINK_CARD_IMG)];
  if (matches.length === 0 || !outDir()) {
    return html;
  }
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const tag = match[0];
      const src = SRC_ATTRIBUTE.exec(tag)?.[1];
      if (!src) {
        return [tag, tag] as const;
      }
      const image = await optimizeOnce(decodeHtml(src), match[1] as Kind);
      return [
        tag,
        withAttributes(tag, {
          ...(image
            ? {
                src: escapeHtml(image.src),
                srcset: image.srcSet ? escapeHtml(image.srcSet) : undefined,
                sizes: image.sizes,
              }
            : {}),
          // the favicon is the only one satteri-link-card leaves eager, and
          // deferring it is worth doing even when the bytes stay third-party
          loading: "lazy",
        }),
      ] as const;
    })
  );
  let result = html;
  for (const [tag, markup] of replacements) {
    if (tag !== markup) {
      result = result.replace(tag, () => markup);
    }
  }
  return result;
};
