import { getImage } from "astro:assets";
import { escapeHtml } from "@miyamo2/astro-image-placeholder";
import {
  stagedImageMetadata,
  stageRemoteImage,
  stagingEnabled,
  type StagedImage,
} from "./staged-remote-image";

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

type Kind = "image" | "favicon";

interface OptimizedImage {
  src: string;
  srcSet?: string;
  sizes: string;
}

const optimize = async (staged: StagedImage, kind: Kind): Promise<OptimizedImage | null> => {
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
      src: stagedImageMetadata(staged),
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
    console.warn(`[link-card-images] failed to optimize ${staged.src}: ${String(e)}`);
    return null;
  }
};

// stageRemoteImage already dedupes and rate limits the download itself; this
// only avoids repeating the (cheap) getImage() bookkeeping per occurrence
const optimizeOnce = async (url: string, kind: Kind): Promise<OptimizedImage | null> => {
  const staged = await stageRemoteImage(url);
  return staged ? await optimize(staged, kind) : null;
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
  if (matches.length === 0 || !stagingEnabled()) {
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
