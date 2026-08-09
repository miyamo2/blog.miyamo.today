import { getImage } from "astro:assets";
import { getRemoteImageSize, getImagePlaceholder, escapeHtml } from "@miyamo2/astro-image-placeholder";
import type { ImageMetadata } from "astro";
import {
  stagedImageMetadata,
  stageRemoteImage,
  stagingEnabled,
  type StagedImage,
} from "./staged-remote-image";

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
  /**
   * Whether to offer the 2x candidate below. `false` for images no `<img>`
   * ever renders -- og:image and JSON-LD carry a single url, so a second
   * variant would be generated and shipped for nothing.
   */
  srcSet?: boolean;
}

// like gatsby's CONSTRAINED layout: offer up to 2x of the target width (capped
// at the source width) so hidpi screens get a sharp candidate instead of
// upscaling the 1x image
const srcsetWidths = (
  targetWidth: number,
  sourceWidth: number,
  options: BuildRemoteImageOptions = {}
): number[] => {
  const widths = [targetWidth];
  if (options.srcSet === false) {
    return widths;
  }
  const cap = Math.min(sourceWidth, targetWidth * 2);
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

// `width` + `height` is taken as given (the caller wants that exact box, and
// getImage() crops to it); a lone `width` -- or neither, which means "up to
// 800" -- is constrained to the source and keeps its aspect ratio.
const resolveTargetSize = (
  source: { width: number; height: number },
  options: BuildRemoteImageOptions
): { width: number; height: number } => {
  if (options.width && options.height) {
    return { width: options.width, height: options.height };
  }
  const width = Math.min(options.width ?? 800, source.width);
  return { width, height: Math.round((width * source.height) / source.width) };
};

/**
 * Builds an optimized (webp) image from an original this build has already
 * downloaded and staged (see ./staged-remote-image), which astro:assets treats
 * as a local image -- so its generation phase never touches the network.
 */
const buildStagedImage = async (
  staged: StagedImage,
  options: BuildRemoteImageOptions
): Promise<RemoteImageData> => {
  const { width: targetWidth, height: targetHeight } = resolveTargetSize(staged, options);
  const meta = stagedImageMetadata(staged);
  // same reason as buildCollectionImage: the image service's getHTMLAttributes
  // hook cannot see a local image's fsPath, so the placeholder is fetched here
  const placeholder = await getImagePlaceholder(meta).catch(() => undefined);
  try {
    const result = await getImage({
      src: meta,
      width: targetWidth,
      height: targetHeight,
      widths: srcsetWidths(targetWidth, staged.width, options),
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
    console.warn(`[images] failed to optimize ${staged.src}: ${String(e)}`);
    // the staged original survives in the output: astro only deletes it after
    // generating variants from it, which is exactly what did not happen here
    return {
      src: staged.src,
      width: targetWidth,
      height: targetHeight,
      placeholder,
    };
  }
};

/**
 * Builds an optimized (webp) remote image via astro:assets, replacing
 * gatsby-plugin-image's gatsbyImageData. Dimension probing and the blur
 * placeholder are provided by @miyamo2/astro-image-placeholder's image
 * service (configured in astro.config.ts), so this only decides target
 * sizes and calls getImage().
 *
 * Only reachable outside a build -- see buildRemoteImage.
 */
const buildUrlImage = async (
  url: string,
  options: BuildRemoteImageOptions
): Promise<RemoteImageData | null> => {
  const size = await getRemoteImageSize(url);
  if (!size || size.width === 0 || size.height === 0) {
    return null;
  }
  const { width: targetWidth, height: targetHeight } = resolveTargetSize(size, options);

  try {
    const result = await getImage({
      src: url,
      width: targetWidth,
      height: targetHeight,
      widths: srcsetWidths(targetWidth, size.width, options),
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
 * Builds an optimized (webp) image from a remote url.
 *
 * A build must not hand that url to getImage() directly: astro would download
 * it in its image-generation phase, where a host that has gone down, a 429, or
 * a format sharp cannot decode aborts the whole build rather than this one
 * image. So a build stages the bytes first (./staged-remote-image) and a
 * failure is a `null` the caller renders around -- for article body images,
 * `renderRemoteImageMarkup`'s plain `<img>` pointing back at the origin.
 *
 * `astro dev` has neither that phase nor a build output to stage into, and
 * resolves a remote src per request, so there it keeps using the url.
 */
export const buildRemoteImage = async (
  url: string | undefined | null,
  options: BuildRemoteImageOptions = {}
): Promise<RemoteImageData | null> => {
  if (!url) {
    return null;
  }
  if (!stagingEnabled()) {
    return buildUrlImage(url, options);
  }
  const staged = await stageRemoteImage(url);
  return staged ? await buildStagedImage(staged, options) : null;
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
  const { width: targetWidth, height: targetHeight } = resolveTargetSize(meta, options);

  // the image service's getHTMLAttributes hook cannot see local images'
  // fsPath (getImage() clones the metadata before invoking any hook, and
  // fsPath does not survive structuredClone) -- fetch it explicitly instead
  const placeholder = await getImagePlaceholder(meta);
  try {
    const result = await getImage({
      src: meta,
      width: targetWidth,
      height: targetHeight,
      widths: srcsetWidths(targetWidth, meta.width, options),
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
 * google's Article guidance asks the image it may show for at least 1200px of
 * width and ~800k pixels; 1200x675 clears both (810k) at 16:9.
 */
const SEO_IMAGE_WIDTH = 1200;

/**
 * The thumbnail as og:image and JSON-LD `image` see it.
 *
 * It is built separately from the one the article page renders, which is
 * deliberately no larger than its CSS box (see #70) and so does not reach
 * either threshold. Enlarging the rendered image instead would put the whole
 * difference on every reader to satisfy a crawler.
 *
 * Never upscales: a source narrower than 1200px cannot be made to meet the
 * guidance, and a stretched copy would only look worse in link previews. No
 * srcset either -- both consumers take a single url.
 */
export const buildSeoImage = (
  meta: ImageMetadata | undefined | null
): Promise<RemoteImageData | null> => {
  const width = Math.min(SEO_IMAGE_WIDTH, meta?.width ?? SEO_IMAGE_WIDTH);
  return buildCollectionImage(meta, {
    width,
    height: Math.round((width * 9) / 16),
    srcSet: false,
  });
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
