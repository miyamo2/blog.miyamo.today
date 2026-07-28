import { unified, type Plugin } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Root } from "mdast";

// The gatsby-remark-* transformers below are plain mdast transformers,
// so they are reused as-is to keep the generated HTML (and the CSS that
// depends on it, e.g. `.gatsby-highlight`, `.anchor`) identical to the
// Gatsby build.
// (the packages below have no type definitions)
import autolinkHeaders from "gatsby-remark-autolink-headers";
import prismjsHighlight from "gatsby-remark-prismjs";
import copyButtonModule from "gatsby-remark-prismjs-copy-button";
import linkCard from "@okaryo/gatsby-remark-link-card";

import prune from "underscore.string/prune";

const copyButton: (args: { markdownAST: Root }, opts: Record<string, never>) => unknown =
  (copyButtonModule as { default?: never }).default ?? copyButtonModule;

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

const collectHeadings = (tree: Root): ArticleHeading[] => {
  const headings: ArticleHeading[] = [];
  visit(tree, "heading", (node) => {
    const id = (node.data as { id?: string } | undefined)?.id ?? "";
    headings.push({
      depth: node.depth,
      id,
      value: mdastToString(node),
    });
  });
  return headings;
};

/**
 * Renders article markdown to HTML through the same transformer chain as the
 * previous Gatsby setup (gatsby-transformer-remark plugins section):
 *   gatsby-remark-autolink-headers
 *   gatsby-remark-prismjs-copy-button
 *   gatsby-remark-prismjs
 *   (remote images -- injected via `extraTransforms`)
 *   @okaryo/gatsby-remark-link-card
 */
export const renderMarkdown = async (
  markdown: string,
  extraTransforms: MdastTransform[] = []
): Promise<RenderedMarkdown> => {
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(markdown);
  const mdast = (await parser.run(tree)) as Root;

  autolinkHeaders({ markdownAST: mdast }, {});
  copyButton({ markdownAST: mdast }, {});
  prismjsHighlight(
    { markdownAST: mdast },
    {
      classPrefix: "language-",
      inlineCodeMarker: null,
      aliases: {},
      showLineNumbers: true,
      noInlineHighlight: false,
    }
  );
  for (const transform of extraTransforms) {
    await transform(mdast);
  }
  await linkCard({ markdownAST: mdast });

  const headings = collectHeadings(mdast);
  const plainText = collectPlainText(mdast);

  const compiler = unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify, { allowDangerousHtml: true });
  const hast = await compiler.run(mdast);
  const html = compiler.stringify(hast);

  return { html: String(html), headings, plainText };
};

/** excerpt of plain markdown without rendering (no OGP fetch, no highlight) */
export const plainTextOfMarkdown = (markdown: string): string => {
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(markdown) as Root;
  return collectPlainText(tree);
};
