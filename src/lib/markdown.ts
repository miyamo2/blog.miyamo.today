export interface ArticleHeading {
  depth: number;
  id: string;
  value: string;
}

/** mirrors lodash `_.truncate(text, { length, omission: "…" })` used by gatsby-transformer-remark */
const lodashLikeTruncate = (text: string, length: number): string => {
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length - 1)}…`;
};

/** port of underscore.string's `prune` (MIT): cut at a word boundary, never mid-word */
const prune = (text: string, length: number, pruneStr: string): string => {
  if (text.length <= length) {
    return text;
  }
  const tmpl = (c: string): string => (c.toUpperCase() !== c.toLowerCase() ? "A" : " ");
  let template = text.slice(0, length + 1).replace(/.(?=\W*\w*$)/g, tmpl);
  if (template.slice(template.length - 2).match(/\w\w/)) {
    template = template.replace(/\s*\S+$/, "");
  } else {
    template = template.slice(0, template.length - 1).replace(/\s+$/, "");
  }
  return (template + pruneStr).length > text.length
    ? text
    : text.slice(0, template.length) + pruneStr;
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
