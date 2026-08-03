import GithubSlugger from "github-slugger";
import type { HastPluginDefinition, MdastPluginDefinition } from "satteri";
import type { Element as HastElement } from "hast";

// the same GitHub octicon-link icon that gatsby-remark-autolink-headers used
const OCTICON_LINK_PATH_D =
  "M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z";

/**
 * Replaces rehype-slug + rehype-autolink-headings: assigns a github-slugger
 * id to every heading (a fresh slugger per document, matching the dedup
 * behaviour satteri's own built-in `heading-ids` plugin would use), then
 * prepends the anchor icon. Runs before satteri's built-in `heading-ids`
 * plugin in the hastPlugins pipeline, so it sets `id` itself instead of
 * relying on it: `heading-ids` reuses an already-set `id` as-is.
 */
export const headingAnchorPlugin = (): HastPluginDefinition => {
  const slugger = new GithubSlugger();
  return {
    name: "heading-anchor",
    element: {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      visit(node, ctx) {
        const existingId = node.properties?.id;
        const id =
          typeof existingId === "string" ? existingId : slugger.slug(ctx.textContent(node));
        if (typeof existingId !== "string") {
          ctx.setProperty(node, "id", id);
        }
        ctx.prependChild(node, {
          type: "element",
          tagName: "a",
          properties: {
            href: `#${id}`,
            ariaLabel: `${id.split("-").join(" ")} permalink`,
            className: ["anchor", "before"],
          },
          children: [
            {
              type: "element",
              tagName: "svg",
              properties: {
                ariaHidden: "true",
                focusable: "false",
                height: "16",
                version: "1.1",
                viewBox: "0 0 16 16",
                width: "16",
              },
              children: [
                {
                  type: "element",
                  tagName: "path",
                  properties: { fillRule: "evenodd", d: OCTICON_LINK_PATH_D },
                  children: [],
                },
              ],
            },
          ],
        });
      },
    },
  };
};

/**
 * Collects the same plain text gatsby-transformer-remark's excerpt used to
 * (text/inlineCode values, image alt text, a space at block boundaries) and
 * stashes it as `frontmatter.plainText`, which astro surfaces as
 * `entry.rendered.metadata.frontmatter.plainText`.
 *
 * mdast plugins have no "end of document" hook, so every visitor call
 * rewrites the accumulated value; the last call in document order always
 * holds the complete text (nothing after it can be missing, or that later
 * node would itself be the last call).
 */
export const plainTextMdastPlugin = (): MdastPluginDefinition => {
  const parts: string[] = [];
  const flush = (ctx: { data: { astro?: { frontmatter: Record<string, unknown> } } }): void => {
    const astro = ctx.data.astro;
    if (astro) {
      astro.frontmatter.plainText = parts.join("").trim();
    }
  };
  return {
    name: "plain-text",
    text(node, ctx) {
      parts.push(node.value);
      flush(ctx);
    },
    inlineCode(node, ctx) {
      parts.push(node.value);
      flush(ctx);
    },
    image(node, ctx) {
      parts.push(node.alt ?? "");
      flush(ctx);
    },
    paragraph(_node, ctx) {
      parts.push(" ");
      flush(ctx);
    },
    heading(_node, ctx) {
      parts.push(" ");
      flush(ctx);
    },
    tableCell(_node, ctx) {
      parts.push(" ");
      flush(ctx);
    },
    break(_node, ctx) {
      parts.push(" ");
      flush(ctx);
    },
  };
};

const copyButtonNode = (): HastElement => ({
  type: "element",
  tagName: "div",
  properties: { className: ["code-copy-button-container"] },
  children: [
    {
      type: "element",
      tagName: "div",
      properties: {
        className: ["code-copy-button"],
        tabIndex: 0,
        role: "button",
        ariaPressed: "false",
        onclick: "copyCodeToClipboard(this, this.parentNode.nextElementSibling)",
      },
      children: [{ type: "text", value: "Copy" }],
    },
  ],
});

/**
 * Marks remote images in the article body for later, off-thread processing
 * (see `replaceRemoteImagePlaceholders` in `./images`) instead of building
 * their markup here.
 *
 * `astro:assets`' `getImage()` needs a live Vite SSR module runner. During
 * content-layer sync (when satteri mdastPlugins run) that runner gets torn
 * down before an async plugin's `getImage()` call resolves, failing with
 * "Vite module runner has been closed" and -- worse -- aborting the whole
 * document's render (glob()'s loader treats any render rejection as "no
 * `rendered` for this file", silently dropping headings/html/plainText
 * along with it). Emitting an inert placeholder here keeps this plugin
 * synchronous and astro:assets-free; `content.ts` resolves the placeholders
 * during the normal page-build phase, where `getImage()` is known to work
 * (see `buildCollectionImage` calls in the same file).
 *
 * Replaces the whole `paragraph` (rather than just the `image` child, as a
 * unified/remark pipeline would) because satteri wraps a node replaced from
 * inside a paragraph in its own extra `<p>`, producing invalid `<p><p>...`
 * nesting; only matches a paragraph whose sole child is the image, mirroring
 * `![alt](url)` on its own line -- gatsby-remark-images-remote's own
 * assumption, which the "resp-image-wrapper" block-level markup depends on.
 */
export const remoteImagesMdastPlugin = (): MdastPluginDefinition => ({
  name: "remote-images",
  paragraph(node) {
    const [only, ...rest] = node.children;
    if (rest.length > 0 || only?.type !== "image") {
      return;
    }
    if (!only.url || !/^https?:\/\//.test(only.url)) {
      return;
    }
    const payload = Buffer.from(
      JSON.stringify({ url: only.url, alt: only.alt ?? "", title: only.title ?? "" })
    ).toString("base64");
    return { raw: `<remote-image data-payload="${payload}"></remote-image>` };
  },
});

/**
 * Replaces the deleted `rehype-code-block.ts`: wraps each highlighted `pre`
 * (satteri's built-in `highlight` hastPlugin, which runs before user
 * plugins, has already turned it into shiki's `<pre data-language="...">`)
 * in `div.code-block` and inserts a copy button before it. The click
 * handler (`copyCodeToClipboard`) lives in Layout.astro.
 */
export const codeCopyButtonPlugin = (): HastPluginDefinition => ({
  name: "code-copy-button",
  element: {
    filter: ["pre"],
    visit(node, ctx) {
      const hasCode = node.children?.some(
        (child) => child.type === "element" && child.tagName === "code"
      );
      if (!hasCode) {
        return;
      }
      const language =
        typeof node.properties?.dataLanguage === "string" ? node.properties.dataLanguage : undefined;
      ctx.insertBefore(node, copyButtonNode());
      ctx.wrapNode(node, {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block"], ...(language ? { dataLanguage: language } : {}) },
        children: [],
      });
    },
  },
});
