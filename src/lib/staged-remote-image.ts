import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import pLimit from "p-limit";
import type { ImageMetadata } from "astro";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// re-fetching every build only costs us rate limits
// (opengraph.githubassets.com starts answering 429 well before a full build's
// worth of requests is through). The TTL is also what eventually stops us
// serving an image whose source has been taken down: once it expires, a
// re-fetch that fails drops the markup back to the origin's own URL.
const ORIGINAL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// astro's image service refuses SVG unless `image.dangerouslyProcessSVG` is on,
// and sharp cannot decode .ico at all. The format is checked against the bytes
// we downloaded rather than the URL, which lies often enough -- and which is
// exactly how a `.svg` favicon slipped through the `getRemoteImageSize` probe
// (image-size reads SVG dimensions happily) and aborted a build.
const DECODABLE_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif", "tiff"]);

const EXTENSIONS: Record<string, string> = { jpeg: "jpg" };

export interface StagedImage {
  /** path relative to the build output root, which is how astro:assets addresses it */
  src: string;
  fsPath: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Build output / cache / assets directories, published by the
 * `remoteImageStaging` integration in astro.config.ts. Page rendering and the
 * astro config live in separate module graphs, so process.env is the only
 * channel between them; their absence means "not a production build".
 */
const outDir = (): string | undefined => process.env.REMOTE_IMAGE_OUT_DIR || undefined;
const cacheDir = (): string | undefined => process.env.REMOTE_IMAGE_CACHE_DIR || undefined;
/**
 * Originals are staged in the assets folder so the variants astro derives from
 * them land next to every other hashed asset -- the deploy step uploads
 * `dist/_astro` first and as `immutable` (see .github/workflows/publish.yaml),
 * which is exactly what they are.
 */
const assetsDir = (): string => process.env.REMOTE_IMAGE_ASSETS_DIR || "_astro";

/**
 * Whether remote images have to be staged before astro:assets may see them.
 * True during `astro build` only: `astro dev` resolves a remote src per
 * request, where a failure costs one broken image rather than the build.
 */
export const stagingEnabled = (): boolean => outDir() !== undefined;

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
  const cacheFile = cache ? join(cache, "remote-images", keyFor(url)) : undefined;
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
 * Downloads one remote image and writes it into the build output, where
 * astro:assets reads a *local* image's bytes from.
 *
 * Handing astro the URL directly would be less code, but it defers the download
 * to astro's own image-generation phase -- and any failure there fails the
 * *entire* build, since astro rethrows every asset-generation error
 * (`astro/dist/core/build/generate.js`). A `getRemoteImageSize` probe before
 * the call is not a guard: it runs while routes are generated, up to a minute
 * before the phase that downloads, and formats it can read are not the same set
 * sharp can decode. Downloading here turns all of that into a `null` the caller
 * renders around, and halves the requests per image on the way.
 *
 * The staged original is deleted again by astro once it has produced the
 * variants, since nothing else references it.
 */
const stage = async (url: string): Promise<StagedImage | null> => {
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
  const src = `/${assetsDir()}/${keyFor(url)}.${EXTENSIONS[format] ?? format}`;
  const fsPath = join(out, src);
  try {
    await mkdir(dirname(fsPath), { recursive: true });
    await writeFile(fsPath, bytes);
  } catch {
    return null;
  }
  return { src, fsPath, width, height, format };
};

// one build meets the same url over and over -- articles link to the same hosts
// repeatedly, and an og:image is both a link card thumbnail and, elsewhere, a
// body image. The concurrency cap keeps us from bursting a single host hard
// enough to be rate limited.
const inflight = new Map<string, Promise<StagedImage | null>>();
const limit = pLimit(4);

export const stageRemoteImage = (url: string): Promise<StagedImage | null> => {
  const pending = inflight.get(url);
  if (pending) {
    return pending;
  }
  const request = limit(() => stage(url));
  inflight.set(url, request);
  return request;
};

/** the shape astro:assets needs to treat a staged original as a local image */
export const stagedImageMetadata = (staged: StagedImage): ImageMetadata =>
  ({
    src: staged.src,
    fsPath: staged.fsPath,
    width: staged.width,
    height: staged.height,
    format: staged.format,
  }) as ImageMetadata;
