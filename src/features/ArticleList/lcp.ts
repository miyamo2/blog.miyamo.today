import type { ArticleCardVM } from "../../lib/content";
import type { RemoteImageData } from "../../lib/images";

/**
 * How many thumbnails can share the first screenful.
 *
 * The layout caps the content at 1400px (layouts/Layout.astro) and the track is
 * `minmax(280px, 1fr)` with a 0.5rem gap, so the grid never gets wider than four
 * columns -- on a desktop viewport all four are above the fold. In the
 * single-column mobile layout the first two cards' thumbnails still reach into
 * the viewport, so the same four cover that case with room to spare.
 */
export const ABOVE_THE_FOLD = 4;

/**
 * The thumbnail the LCP is measured on: the one that gets `fetchpriority=high`
 * and the `<link rel="preload">` in the document head.
 *
 * It is the first card *with a thumbnail* rather than simply the first card: a
 * card whose article has no image renders no `<img>` at all (ArticleCard only
 * mounts RemoteImage when `imageData` is set), so pinning the hint to index 0
 * can spend it on nothing and leave the image that actually becomes the LCP
 * element loading lazily.
 */
export const lcpThumbnailIndex = (cards: ArticleCardVM[]): number =>
  cards.findIndex((card) => card.imageData);

/** The image `lcpThumbnailIndex` picks, for the head of the page showing `cards`. */
export const lcpThumbnail = (cards: ArticleCardVM[]): RemoteImageData | null =>
  cards[lcpThumbnailIndex(cards)]?.imageData ?? null;
