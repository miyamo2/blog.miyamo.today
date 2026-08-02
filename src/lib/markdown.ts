import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkLinkCard from "remark-link-card-plus";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrism from "rehype-prism-plus";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import type { Root as HastRoot, Element as HastElement } from "hast";

import prune from "underscore.string/prune";

import { rehypeCodeBlock } from "./rehype-code-block";

export interface ArticleHeading {
  depth: number;
  id: string;
  value: string;
}

export interface RenderedMarkdown {
  html: string;
  headings: ArticleHeading[];
  /** plain text of the article, used for excerpts */
  plainText: string;
}

export type MdastTransform = (tree: Root) => Promise<void> | void;

/** mirrors lodash `_.truncate(text, { length, omission: "…" })` used by gatsby-transformer-remark */
const lodashLikeTruncate = (text: string, length: number): string => {
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length - 1)}…`;
};

/**
 * Same as gatsby-transformer-remark's `excerpt(pruneLength: n, truncate: bool)`
 * applied to the plain text collected from the transformed AST.
 */
export const excerptOf = (plainText: string, pruneLength: number, truncate: boolean): string => {
  if (truncate) {
    return lodashLikeTruncate(plainText, pruneLength);
  }
  return prune(plainText, pruneLength, "…");
};

// mirrors gatsby-transformer-remark's getExcerptPlain()
const SPACE_MARKDOWN_NODE_TYPES = new Set(["paragraph", "heading", "tableCell", "break"]);

const collectPlainText = (tree: Root): string => {
  const excerptNodes: string[] = [];
  visit(tree, (node) => {
    if (node.type === "text" || node.type === "inlineCode") {
      excerptNodes.push((node as { value: string }).value);
    } else if (node.type === "image") {
      excerptNodes.push((node as { alt?: string }).alt ?? "");
    } else if (SPACE_MARKDOWN_NODE_TYPES.has(node.type)) {
      excerptNodes.push(" ");
    }
  });
  return excerptNodes.join("").trim();
};

const HEADING_DEPTHS: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

const collectHeadings = (tree: HastRoot): ArticleHeading[] => {
  const headings: ArticleHeading[] = [];
  visit(tree, "element", (node: HastElement) => {
    const depth = HEADING_DEPTHS[node.tagName];
    if (!depth) {
      return;
    }
    let value = "";
    visit(node, "text", (textNode: { value: string }) => {
      value += textNode.value;
    });
    headings.push({
      depth,
      id: String(node.properties?.id ?? ""),
      value,
    });
  });
  return headings;
};

// the same GitHub octicon-link icon that gatsby-remark-autolink-headers used
const OCTICON_LINK_SVG =
  '<svg aria-hidden="true" focusable="false" height="16" version="1.1" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path></svg>';

/**
 * Renders article markdown to HTML through the remark/rehype equivalents of
 * the previous Gatsby transformer chain:
 *   gatsby-remark-autolink-headers    -> rehype-slug + rehype-autolink-headings
 *   gatsby-remark-prismjs             -> rehype-prism-plus
 *   gatsby-remark-prismjs-copy-button -> rehypeCodeBlock (in-repo)
 *   @okaryo/gatsby-remark-link-card   -> remark-link-card-plus
 *   (remote images -- injected via `extraTransforms`)
 */
export const renderMarkdown = async (
  markdown: string,
  extraTransforms: MdastTransform[] = []
): Promise<RenderedMarkdown> => {
  const remarkProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkLinkCard, {
    cache: false,
    // the previous link card plugin displayed `url.hostname`
    shortenUrl: true,
    thumbnailPosition: "right",
  });
  const parsed = remarkProcessor.parse(markdown);
  const mdast = (await remarkProcessor.run(parsed)) as Root;
  for (const transform of extraTransforms) {
    await transform(mdast);
  }

  const plainText = collectPlainText(mdast);

  const rehypeProcessor = unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "prepend",
      properties(node: HastElement) {
        const id = String(node.properties?.id ?? "");
        return {
          ariaLabel: `${id.split("-").join(" ")} permalink`,
          className: ["anchor", "before"],
        };
      },
      content: { type: "raw", value: OCTICON_LINK_SVG },
    })
    .use(rehypePrism, { showLineNumbers: true, ignoreMissing: true })
    .use(rehypeCodeBlock)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const hast = (await rehypeProcessor.run(mdast)) as HastRoot;
  const headings = collectHeadings(hast);
  const html = rehypeProcessor.stringify(hast);

  return { html: String(html), headings, plainText };
};

/** excerpt of plain markdown without rendering (no OGP fetch, no highlight) */
export const plainTextOfMarkdown = (markdown: string): string => {
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(markdown) as Root;
  return collectPlainText(tree);
};
