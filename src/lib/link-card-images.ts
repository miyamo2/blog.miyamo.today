import { getImage } from "astro:assets";
import { escapeHtml } from "@miyamo2/astro-image-placeholder";
import type { ImageMetadata } from "astro";
import { stagedImageMetadata, stageRemoteImage } from "./staged-remote-image";
import { siteMetadata } from "./site";

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

/** `source` is a local image: either a staged original or a collection thumbnail */
const optimize = async (source: ImageMetadata, kind: Kind): Promise<OptimizedImage | null> => {
  const isThumbnail = kind === "image";
  const targetWidth = isThumbnail ? THUMBNAIL_WIDTH : FAVICON_WIDTH;
  const targetHeight = isThumbnail
    ? THUMBNAIL_HEIGHT
    : // favicons are not always square; keep their aspect and let the CSS box crop
      Math.max(1, Math.round((FAVICON_WIDTH * source.height) / source.width));
  // never upscale past the source: those variants are bytes with no detail
  const widths = (isThumbnail ? THUMBNAIL_WIDTHS : FAVICON_WIDTHS).filter(
    (width) => width <= source.width
  );
  try {
    const result = await getImage({
      src: source,
      width: targetWidth,
      height: targetHeight,
      widths: widths.length > 0 ? widths : [Math.min(targetWidth, source.width)],
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
    console.warn(`[link-card-images] failed to optimize ${source.src}: ${String(e)}`);
    return null;
  }
};

// stageRemoteImage already dedupes and rate limits the download itself; this
// only avoids repeating the (cheap) getImage() bookkeeping per occurrence
const optimizeOnce = async (url: string, kind: Kind): Promise<OptimizedImage | null> => {
  const staged = await stageRemoteImage(url);
  return staged ? await optimize(stagedImageMetadata(staged), kind) : null;
};

// the card is one <a> with no nested anchors, so the first `</a>` closes it
const LINK_CARD = /<a\b[^>]*\bclass="satteri-link-card"[^>]*>[\s\S]*?<\/a>/g;
const LINK_CARD_IMG = /<img\b[^>]*\bclass="satteri-link-card__(image|favicon)"[^>]*>/g;
const HREF_ATTRIBUTE = /\shref="([^"]*)"/;
const SRC_ATTRIBUTE = /\ssrc="([^"]*)"/;

const ARTICLE_PATH = /^\/articles\/([^/]+)\/?$/;

/** the article id a link card's href points at, when it points back at this blog */
const selfArticleId = (href: string): string | undefined => {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  if (url.origin !== siteMetadata.siteUrl) {
    return undefined;
  }
  return ARTICLE_PATH.exec(url.pathname)?.[1];
};

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

/** substitutes each match of a single `matchAll` pass with `replacements[i]` */
const splice = (source: string, matches: RegExpExecArray[], replacements: string[]): string => {
  let result = "";
  let cursor = 0;
  matches.forEach((match, i) => {
    result += source.slice(cursor, match.index) + replacements[i];
    cursor = match.index + match[0].length;
  });
  return result + source.slice(cursor);
};

const rewriteImage = async (
  tag: string,
  kind: Kind,
  thumbnail: ImageMetadata | undefined
): Promise<string> => {
  const src = SRC_ATTRIBUTE.exec(tag)?.[1];
  // a card linking to one of our own articles has the article's thumbnail on
  // hand, so the scraped og:image URL is never even looked at
  const image =
    kind === "image" && thumbnail
      ? await optimize(thumbnail, kind)
      : src
        ? await optimizeOnce(decodeHtml(src), kind)
        : null;
  if (!image && !src) {
    return tag;
  }
  return withAttributes(tag, {
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
  });
};

const rewriteCard = async (
  card: string,
  thumbnails: ReadonlyMap<string, ImageMetadata>
): Promise<string> => {
  const href = HREF_ATTRIBUTE.exec(card)?.[1];
  const id = href ? selfArticleId(decodeHtml(href)) : undefined;
  // an id the collection does not know (a since-renamed article, say) falls
  // through to the staged-remote path, same as any third-party link
  const thumbnail = id !== undefined ? thumbnails.get(id) : undefined;
  const images = [...card.matchAll(LINK_CARD_IMG)];
  const replacements = await Promise.all(
    images.map((match) => rewriteImage(match[0], match[1] as Kind, thumbnail))
  );
  return splice(card, images, replacements);
};

/**
 * Re-points the `<img>`s satteri-link-card rendered at responsive webp variants
 * sized for the card's actual box, which also moves the third-party thumbnails
 * onto our own origin. Anything that could not be optimized keeps its original
 * URL and only gains the `lazy` satteri-link-card omits on favicons.
 *
 * A card pointing at one of our own articles is resolved from `thumbnails`
 * (keyed by article id) rather than from the URL satteri-link-card scraped.
 * That URL is a `/_astro/<name>.<hash>.<hash>.webp` off the *previously
 * deployed* site, and the hash rotates whenever the image-transform parameters
 * change -- after which the deploy's `aws s3 sync --delete` takes the old
 * asset away and the card is left pointing at a 404. Reading the linked
 * article's own collection thumbnail instead removes both the stale URL and
 * the network round trip, and picks up a replaced thumbnail immediately. It is
 * also the one path that still works outside `astro build`, where nothing is
 * staged (`stageRemoteImage` is a no-op there) and every other image keeps the
 * URL satteri-link-card gave it.
 *
 * Rewriting the serialized HTML rather than the hast tree is deliberate, for
 * the same reason `replaceRemoteImagePlaceholders` (./images) exists: satteri's
 * hastPlugins -- where satteri-link-card builds these nodes -- run during
 * content-layer sync, where `getImage()` is not usable.
 */
export const optimizeLinkCardImages = async (
  html: string,
  thumbnails: ReadonlyMap<string, ImageMetadata> = new Map()
): Promise<string> => {
  const cards = [...html.matchAll(LINK_CARD)];
  if (cards.length === 0) {
    return html;
  }
  const replacements = await Promise.all(cards.map((card) => rewriteCard(card[0], thumbnails)));
  return splice(html, cards, replacements);
};
