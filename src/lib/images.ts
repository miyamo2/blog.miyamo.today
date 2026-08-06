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
  /** srcSet width descriptors. omitted -> [target, 2x target] (see srcsetWidths) */
  widths?: number[];
  /** sizes attribute paired with the srcSet. omitted -> sizesFor(target) */
  sizes?: string;
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

// explicit `widths` win over the 1x/2x default, but never upscale past the
// source (astro happily emits an upscaled variant, which is pure bytes)
const candidateWidths = (
  widths: number[] | undefined,
  targetWidth: number,
  sourceWidth: number
): number[] => {
  if (!widths || widths.length === 0) {
    return srcsetWidths(targetWidth, sourceWidth);
  }
  return [...new Set(widths.map((width) => Math.min(width, sourceWidth)))].sort((a, b) => a - b);
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
      widths: candidateWidths(options.widths, targetWidth, size.width),
      format: "webp",
      quality: IMAGE_QUALITY,
      ...(options.width && options.height ? { fit: "cover" as const } : {}),
    });
    const srcSet = result.srcSet.attribute !== "" ? result.srcSet.attribute : undefined;
    return {
      src: result.src,
      srcSet,
      sizes: srcSet ? (options.sizes ?? sizesFor(targetWidth)) : undefined,
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
      widths: candidateWidths(options.widths, targetWidth, meta.width),
      format: "webp",
      quality: IMAGE_QUALITY,
      ...(options.width && options.height ? { fit: "cover" as const } : {}),
    });
    const srcSet = result.srcSet.attribute !== "" ? result.srcSet.attribute : undefined;
    return {
      src: result.src,
      srcSet,
      sizes: srcSet ? (options.sizes ?? sizesFor(targetWidth)) : undefined,
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
      const { url, alt, title } = JSON.parse(Buffer.from(match[1], "base64").toString("utf-8")) as {
        url: string;
        alt: string;
        title: string;
      };
      return [match[0], await renderRemoteImageMarkup(url, alt, title)] as const;
    })
  );
  let result = html;
  for (const [placeholder, markup] of replacements) {
    result = result.replace(placeholder, markup);
  }
  return result;
};

// satteri-link-card emits the OGP image / favicon URLs verbatim (its own
// `imageCache` only self-hosts the original bytes, it never resizes), so a
// 1200x600 og:image lands in a box that is never wider than ~273 CSS px --
// PageSpeed Insights' "Improve image delivery". These constants describe that
// box; see `.satteri-link-card__media` / `__favicon` in styles/vendor.css.
const LINK_CARD_IMAGE_WIDTH = 280;
const LINK_CARD_IMAGE_HEIGHT = 140;
// 448w is the mobile candidate lighthouse asks for (412px viewport, 40vw slot,
// DPR 1.75); 560w covers the widest desktop box (273px) at DPR 2
const LINK_CARD_IMAGE_WIDTHS = [160, 280, 448, 560];
// media box is 40% of the card below 768px and 30% above it; the card itself is
// the content column, which stops growing at 1400px * 65% (see article-detail.css)
const LINK_CARD_IMAGE_SIZES = `(min-width: 1200px) ${LINK_CARD_IMAGE_WIDTH}px, (min-width: 768px) 30vw, 40vw`;
const LINK_CARD_FAVICON_WIDTH = 14;

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

// one build fetches/optimizes the same og:image and (especially) the same
// favicon over and over -- articles link to the same hosts repeatedly
const linkCardImageCache = new Map<string, Promise<RemoteImageData | null>>();

const linkCardImage = (url: string, kind: "image" | "favicon"): Promise<RemoteImageData | null> => {
  const key = `${kind}:${url}`;
  const cached = linkCardImageCache.get(key);
  if (cached) {
    return cached;
  }
  const pending = buildRemoteImage(
    url,
    kind === "image"
      ? {
          width: LINK_CARD_IMAGE_WIDTH,
          height: LINK_CARD_IMAGE_HEIGHT,
          widths: LINK_CARD_IMAGE_WIDTHS,
          sizes: LINK_CARD_IMAGE_SIZES,
        }
      : { width: LINK_CARD_FAVICON_WIDTH }
  );
  linkCardImageCache.set(key, pending);
  return pending;
};

/**
 * Re-points the `<img>`s satteri-link-card rendered at astro:assets-optimized
 * (webp, responsive) variants sized for the card's actual box, which also
 * moves the third-party thumbnails onto our own origin.
 *
 * Rewriting the serialized HTML rather than the hast tree is deliberate, for
 * the same reason `replaceRemoteImagePlaceholders` exists: satteri's
 * hastPlugins -- where satteri-link-card builds these nodes -- run during
 * content-layer sync, where `getImage()` is not usable.
 *
 * Anything that cannot be probed or optimized (an .ico favicon, an
 * unreachable host) keeps its original markup, courtesy of buildRemoteImage
 * returning null / the source url.
 */
export const optimizeLinkCardImages = async (html: string): Promise<string> => {
  const matches = [...html.matchAll(LINK_CARD_IMG)];
  if (matches.length === 0) {
    return html;
  }
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const tag = match[0];
      const src = SRC_ATTRIBUTE.exec(tag)?.[1];
      if (!src) {
        return [tag, tag] as const;
      }
      const kind = match[1] as "image" | "favicon";
      const image = await linkCardImage(decodeHtml(src), kind);
      if (!image) {
        return [tag, tag] as const;
      }
      return [
        tag,
        withAttributes(tag, {
          src: escapeHtml(image.src),
          srcset: image.srcSet ? escapeHtml(image.srcSet) : undefined,
          sizes: image.sizes,
          // the favicon is the only one satteri-link-card leaves eager
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
