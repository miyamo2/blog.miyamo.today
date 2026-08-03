import type { ImagePlaceholderRenderContext } from "@miyamo2/astro-image-placeholder";

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Markup for a remote image in the article body, matching what
 * gatsby-remark-images-remote produced (max-width 800, webp, blurred
 * placeholder behind a lazily loaded img).
 *
 * Handed to `remarkImagePlaceholder` as its `render` callback — fetching,
 * placeholder generation and node replacement live in the package; this is the
 * only part that is specific to this site's CSS.
 */
export const renderRemoteImage = (image: ImagePlaceholderRenderContext): string => {
  const alt = escapeHtml(image.alt ?? "");
  const title = escapeHtml(image.title ?? "");
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
      href="${escapeHtml(image.url)}"
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
};
