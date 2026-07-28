import { getImage } from "astro:assets";
import { visit } from "unist-util-visit";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Root, Image as MdastImage } from "mdast";
import type { MdastTransform } from "./markdown";

export interface RemoteImageData {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  /** base64 data url used as blurred placeholder (like gatsby's BLURRED placeholder) */
  placeholder?: string;
}

interface RemoteImageInfo {
  width: number;
  height: number;
  placeholder?: string;
}

const CACHE_DIR = path.join(process.cwd(), ".cache", "remote-image-meta");

const infoCache = new Map<string, Promise<RemoteImageInfo | undefined>>();

// keep the number of parallel remote fetches reasonable
let inflight = 0;
const queue: (() => void)[] = [];
const withLimit = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (inflight >= 8) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  inflight++;
  try {
    return await fn();
  } finally {
    inflight--;
    queue.shift()?.();
  }
};

const fetchRemoteImageInfo = (url: string): Promise<RemoteImageInfo | undefined> => {
  const cached = infoCache.get(url);
  if (cached) {
    return cached;
  }
  const promise = (async (): Promise<RemoteImageInfo | undefined> => {
    const cacheKey = createHash("sha256").update(url).digest("hex");
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
    try {
      const fromDisk = JSON.parse(await readFile(cacheFile, "utf-8")) as RemoteImageInfo;
      return fromDisk;
    } catch {
      // cache miss
    }
    try {
      return await withLimit(async () => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`failed to fetch image: ${url} (${res.status})`);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const { default: sharp } = await import("sharp");
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const width = metadata.width ?? 0;
        const height = metadata.height ?? 0;
        const placeholderBuffer = await image
          .clone()
          .resize({ width: 20 })
          .webp({ quality: 50 })
          .toBuffer();
        const info: RemoteImageInfo = {
          width,
          height,
          placeholder: `data:image/webp;base64,${placeholderBuffer.toString("base64")}`,
        };
        await mkdir(CACHE_DIR, { recursive: true });
        await writeFile(cacheFile, JSON.stringify(info));
        return info;
      });
    } catch (e) {
      console.warn(`[images] ${String(e)}`);
      return undefined;
    }
  })();
  infoCache.set(url, promise);
  return promise;
};

export interface BuildRemoteImageOptions {
  /** target width. omitted -> constrained to natural size (max 800px) */
  width?: number;
  /** target height. requires width; crops with fit: cover like gatsbyImageData(width, height) */
  height?: number;
}

/**
 * Builds an optimized (webp) remote image via astro:assets, replacing
 * gatsby-plugin-image's gatsbyImageData.
 */
export const buildRemoteImage = async (
  url: string | undefined | null,
  options: BuildRemoteImageOptions = {}
): Promise<RemoteImageData | null> => {
  if (!url) {
    return null;
  }
  const info = await fetchRemoteImageInfo(url);
  if (!info || info.width === 0 || info.height === 0) {
    return null;
  }

  let targetWidth: number;
  let targetHeight: number;
  if (options.width && options.height) {
    targetWidth = options.width;
    targetHeight = options.height;
  } else if (options.width) {
    targetWidth = Math.min(options.width, info.width);
    targetHeight = Math.round((targetWidth * info.height) / info.width);
  } else {
    targetWidth = Math.min(800, info.width);
    targetHeight = Math.round((targetWidth * info.height) / info.width);
  }

  const densities = info.width >= targetWidth * 2 ? [1, 2] : [1];
  try {
    const result = await getImage({
      src: url,
      width: targetWidth,
      height: targetHeight,
      densities,
      format: "webp",
      quality: 100,
      ...(options.width && options.height ? { fit: "cover" as const } : {}),
    });
    return {
      src: result.src,
      srcSet: result.srcSet.attribute !== "" ? result.srcSet.attribute : undefined,
      width: targetWidth,
      height: targetHeight,
      placeholder: info.placeholder,
    };
  } catch (e) {
    console.warn(`[images] failed to optimize ${url}: ${String(e)}`);
    return {
      src: url,
      width: targetWidth,
      height: targetHeight,
      placeholder: info.placeholder,
    };
  }
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Replaces remote images in the article body with the same markup as
 * gatsby-remark-images-remote (max-width 800, webp, blurred placeholder).
 */
export const remoteImagesTransform = (): MdastTransform => {
  return async (tree: Root) => {
    const targets: { node: MdastImage }[] = [];
    visit(tree, "image", (node: MdastImage) => {
      if (!node.url || !/^https?:\/\//.test(node.url)) {
        return;
      }
      targets.push({ node });
    });

    await Promise.all(
      targets.map(async ({ node }) => {
        const image = await buildRemoteImage(node.url);
        if (!image) {
          return;
        }
        const alt = escapeHtml(node.alt ?? "");
        const title = escapeHtml(node.title ?? "");
        const ratio = (image.height / image.width) * 100;
        const placeholderStyle = image.placeholder
          ? `background-image: url('${image.placeholder}'); background-size: cover;`
          : "";
        const html = `
  <span
    class="gatsby-resp-image-wrapper"
    style="position: relative; display: block; margin-left: auto; margin-right: auto; max-width: ${image.width}px;"
  >
    <a
      class="gatsby-resp-image-link"
      href="${escapeHtml(node.url)}"
      style="display: block"
      target="_blank"
      rel="noopener"
    >
      <span
        class="gatsby-resp-image-background-image"
        style="padding-bottom: ${ratio}%; position: relative; bottom: 0; left: 0; ${placeholderStyle} display: block;"
      ></span>
      <img
        class="gatsby-resp-image-image"
        alt="${alt}"
        title="${title}"
        src="${image.src}"
        ${image.srcSet ? `srcset="${image.srcSet}"` : ""}
        sizes="(max-width: ${image.width}px) 100vw, ${image.width}px"
        style="width: 100%; height: 100%; margin: 0; vertical-align: middle; position: absolute; top: 0; left: 0;"
        loading="lazy"
        decoding="async"
      />
    </a>
  </span>`;
        const replacement = node as unknown as { type: string; value: string; children?: unknown };
        replacement.type = "html";
        replacement.value = html;
        delete replacement.children;
      })
    );
  };
};
