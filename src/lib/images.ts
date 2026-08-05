import { getImage } from "astro:assets";
import { getRemoteImageSize, getImagePlaceholder, escapeHtml } from "@miyamo2/astro-image-placeholder";
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

// webp encode quality. 100 disables webp's perceptual quantization almost
// entirely and made every variant 3-4x larger than it needs to be (PageSpeed
// Insights' "increasing the image compression factor could improve this
// image's download size"). 80 is both sharp's and astro's own default
// (`quality: "high"` maps to 80 for webp) and is visually indistinguishable
// here at the sizes we serve.
const IMAGE_QUALITY = 80;

/**
 * Builds an optimized (webp) remote image via astro:assets, replacing
 * gatsby-plugin-image's gatsbyImageData. Dimension probing and the blur
 * placeholder are provided by @miyamo2/astro-image-placeholder's image
 * service (configured in astro.config.ts), so this only decides target
 * sizes and calls getImage().
 */
export const buildRemoteImage = async (
  url: string | undefined | null,
  options: BuildRemoteImageOptions = {}
): Promise<RemoteImageData | null> => {
  if (!url) {
    return null;
  }
  const size = await getRemoteImageSize(url);
  if (!size || size.width === 0 || size.height === 0) {
    return null;
  }

  let targetWidth: number;
  let targetHeight: number;
  if (options.width && options.height) {
    targetWidth = options.width;
    targetHeight = options.height;
  } else if (options.width) {
    targetWidth = Math.min(options.width, size.width);
    targetHeight = Math.round((targetWidth * size.height) / size.width);
  } else {
    targetWidth = Math.min(800, size.width);
    targetHeight = Math.round((targetWidth * size.height) / size.width);
  }

  try {
    const result = await getImage({
      src: url,
      width: targetWidth,
      height: targetHeight,
      widths: srcsetWidths(targetWidth, size.width),
      format: "webp",
      quality: IMAGE_QUALITY,
      ...(options.width && options.height ? { fit: "cover" as const } : {}),
    });
    const srcSet = result.srcSet.attribute !== "" ? result.srcSet.attribute : undefined;
    return {
      src: result.src,
      srcSet,
      sizes: srcSet ? sizesFor(targetWidth) : undefined,
      width: targetWidth,
      height: targetHeight,
      placeholder: result.attributes["data-placeholder"] as string | undefined,
    };
  } catch (e) {
    console.warn(`[images] failed to optimize ${url}: ${String(e)}`);
    return {
      src: url,
      width: targetWidth,
      height: targetHeight,
    };
  }
};

/**
 * Builds an optimized (webp) image from a local content-collection image
 * (thumbnails downloaded by @miyamo2/astro-loader-blogapi-miyamo-today),
 * producing the same RemoteImageData shape as buildRemoteImage.
 */
export const buildCollectionImage = async (
  meta: ImageMetadata | undefined | null,
  options: BuildRemoteImageOptions = {}
): Promise<RemoteImageData | null> => {
  if (!meta || meta.width === 0 || meta.height === 0) {
    return null;
  }

  let targetWidth: number;
  let targetHeight: number;
  if (options.width && options.height) {
    targetWidth = options.width;
    targetHeight = options.height;
  } else if (options.width) {
    targetWidth = Math.min(options.width, meta.width);
    targetHeight = Math.round((targetWidth * meta.height) / meta.width);
  } else {
    targetWidth = Math.min(800, meta.width);
    targetHeight = Math.round((targetWidth * meta.height) / meta.width);
  }

  // the image service's getHTMLAttributes hook cannot see local images'
  // fsPath (getImage() clones the metadata before invoking any hook, and
  // fsPath does not survive structuredClone) -- fetch it explicitly instead
  const placeholder = await getImagePlaceholder(meta);
  try {
    const result = await getImage({
      src: meta,
      width: targetWidth,
      height: targetHeight,
      widths: srcsetWidths(targetWidth, meta.width),
      format: "webp",
      quality: IMAGE_QUALITY,
      ...(options.width && options.height ? { fit: "cover" as const } : {}),
    });
    const srcSet = result.srcSet.attribute !== "" ? result.srcSet.attribute : undefined;
    return {
      src: result.src,
      srcSet,
      sizes: srcSet ? sizesFor(targetWidth) : undefined,
      width: targetWidth,
      height: targetHeight,
      placeholder,
    };
  } catch (e) {
    console.warn(`[images] failed to optimize ${meta.src}: ${String(e)}`);
    return {
      src: meta.src,
      width: targetWidth,
      height: targetHeight,
      placeholder,
    };
  }
};

/**
 * Builds the same markup gatsby-remark-images-remote used to (max-width
 * 800, webp, blurred placeholder), for one remote image URL.
 */
const renderRemoteImageMarkup = async (
  url: string,
  alt: string,
  title: string
): Promise<string> => {
  const image = await buildRemoteImage(url);
  if (!image) {
    // matches satteri's default (unoptimized) image markup as a fallback
    return `<img alt="${escapeHtml(alt)}" title="${escapeHtml(title)}" src="${escapeHtml(url)}" loading="lazy" decoding="async" />`;
  }
  const ratio = (image.height / image.width) * 100;
  const placeholderStyle = image.placeholder
    ? `background-image: url('${image.placeholder}'); background-size: cover;`
    : "";
  return `
  <span
    class="resp-image-wrapper"
    style="position: relative; display: block; margin-left: auto; margin-right: auto; max-width: ${image.width}px;"
  >
    <a
      class="resp-image-link"
      href="${escapeHtml(url)}"
      style="display: block"
      target="_blank"
      rel="noopener"
    >
      <span
        class="resp-image-background-image"
        style="padding-bottom: ${ratio}%; position: relative; bottom: 0; left: 0; ${placeholderStyle} display: block;"
      ></span>
      <img
        class="resp-image-image"
        alt="${escapeHtml(alt)}"
        title="${escapeHtml(title)}"
        src="${image.src}"
        ${image.srcSet ? `srcset="${image.srcSet}"` : ""}
        sizes="(max-width: ${image.width}px) 100vw, ${image.width}px"
        style="width: 100%; height: 100%; margin: 0; vertical-align: middle; position: absolute; top: 0; left: 0;"
        loading="lazy"
        decoding="async"
      />
    </a>
  </span>`;
};

const REMOTE_IMAGE_PLACEHOLDER = /<remote-image data-payload="([^"]+)"><\/remote-image>/g;

/**
 * Resolves the `<remote-image>` placeholders `remoteImagesMdastPlugin`
 * (src/lib/satteri-plugins.ts) leaves in `entry.rendered.html`, building the
 * actual (astro:assets-optimized) markup during the page-build phase.
 *
 * This two-phase resolution (inert placeholder at content-sync time, real
 * getImage() call at page-render time) is deliberate: satteri's mdastPlugins
 * run during content-layer sync, where astro:assets' getImage() -- and thus
 * @miyamo2/astro-image-placeholder's remarkImagePlaceholder, which calls it
 * internally -- is not usable (see that package's README).
 */
export const replaceRemoteImagePlaceholders = async (html: string): Promise<string> => {
  const matches = [...html.matchAll(REMOTE_IMAGE_PLACEHOLDER)];
  if (matches.length === 0) {
    return html;
  }
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const { url, alt, title } = JSON.parse(
        Buffer.from(match[1], "base64").toString("utf-8")
      ) as { url: string; alt: string; title: string };
      return [match[0], await renderRemoteImageMarkup(url, alt, title)] as const;
    })
  );
  let result = html;
  for (const [placeholder, markup] of replacements) {
    result = result.replace(placeholder, markup);
  }
  return result;
};
