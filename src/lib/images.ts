import { getImage } from "astro:assets";
import { getImagePlaceholder, getRemoteImageSize } from "@miyamo2/astro-image-placeholder";
import type { ImageMetadata } from "astro";

export interface RemoteImageData {
  src: string;
  srcSet?: string;
  /** sizes attribute paired with the width-descriptor srcSet */
  sizes?: string;
  width: number;
  height: number;
  /** base64 data url used as blurred placeholder (like gatsby's BLURRED placeholder) */
  placeholder?: string;
}

export interface BuildRemoteImageOptions {
  /** target width. omitted -> constrained to natural size (max 800px) */
  width?: number;
  /** target height. requires width; crops with fit: cover like gatsbyImageData(width, height) */
  height?: number;
}

// like gatsby's CONSTRAINED layout: offer up to 2x of the target width (capped
// at the source width) so hidpi screens get a sharp candidate instead of
// upscaling the 1x image
const srcsetWidths = (targetWidth: number, sourceWidth: number): number[] => {
  const cap = Math.min(sourceWidth, targetWidth * 2);
  const widths = [targetWidth];
  if (cap > targetWidth) {
    widths.push(cap);
  }
  return widths;
};

const sizesFor = (targetWidth: number): string =>
  `(min-width: ${targetWidth}px) ${targetWidth}px, 100vw`;

const targetSize = (
  natural: { width: number; height: number },
  options: BuildRemoteImageOptions
): { width: number; height: number } => {
  if (options.width && options.height) {
    return { width: options.width, height: options.height };
  }
  const width = Math.min(options.width ?? 800, natural.width);
  return { width, height: Math.round((width * natural.height) / natural.width) };
};

/**
 * Builds an optimized (webp) remote image via astro:assets, replacing
 * gatsby-plugin-image's gatsbyImageData.
 *
 * The blurred placeholder comes back on the `getImage()` result, attached by
 * the image service configured in astro.config.ts.
 */
export const buildRemoteImage = async (
  url: string | undefined | null,
  options: BuildRemoteImageOptions = {}
): Promise<RemoteImageData | null> => {
  if (!url) {
    return null;
  }
  // srcset candidates need the natural width, and that has to be known before
  // getImage() runs; this reads the same cache the image service does
  const natural = await getRemoteImageSize(url);
  if (!natural) {
    return null;
  }
  const { width, height } = targetSize(natural, options);

  try {
    const result = await getImage({
      src: url,
      width,
      height,
      widths: srcsetWidths(width, natural.width),
      format: "webp",
      quality: 100,
      ...(options.width && options.height ? { fit: "cover" as const } : {}),
    });
    const srcSet = result.srcSet.attribute !== "" ? result.srcSet.attribute : undefined;
    return {
      src: result.src,
      srcSet,
      sizes: srcSet ? sizesFor(width) : undefined,
      width,
      height,
      placeholder: result.attributes["data-placeholder"] as string | undefined,
    };
  } catch (e) {
    console.warn(`[images] failed to optimize ${url}: ${String(e)}`);
    return {
      src: url,
      width,
      height,
      placeholder: await getImagePlaceholder(url),
    };
  }
};

// ---- local images (content collection thumbnails) ---------------------------

/**
 * Builds an optimized (webp) image from a local content-collection image
 * (thumbnails downloaded by @miyamo2/astro-loader-blogapi-miyamo-today),
 * producing the same RemoteImageData shape as buildRemoteImage.
 *
 * Unlike the remote case the placeholder is asked for explicitly: astro
 * replaces `src` with a structuredClone of the ImageMetadata before the image
 * service sees it, and `fsPath` does not survive the clone.
 */
export const buildCollectionImage = async (
  meta: ImageMetadata | undefined | null,
  options: BuildRemoteImageOptions = {}
): Promise<RemoteImageData | null> => {
  if (!meta || meta.width === 0 || meta.height === 0) {
    return null;
  }
  const { width, height } = targetSize(meta, options);
  const placeholder = await getImagePlaceholder(meta);

  try {
    const result = await getImage({
      src: meta,
      width,
      height,
      widths: srcsetWidths(width, meta.width),
      format: "webp",
      quality: 100,
      ...(options.width && options.height ? { fit: "cover" as const } : {}),
    });
    const srcSet = result.srcSet.attribute !== "" ? result.srcSet.attribute : undefined;
    return {
      src: result.src,
      srcSet,
      sizes: srcSet ? sizesFor(width) : undefined,
      width,
      height,
      placeholder,
    };
  } catch (e) {
    console.warn(`[images] failed to optimize ${meta.src}: ${String(e)}`);
    return {
      src: meta.src,
      width,
      height,
      placeholder,
    };
  }
};
