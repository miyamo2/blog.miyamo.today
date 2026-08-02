import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

// Replaces gatsby-remark-prismjs-copy-button (and the `.gatsby-highlight`
// wrapper div that gatsby-remark-prismjs used to add):
//   - wraps each code block in <div class="code-block" data-language="x"> so
//     the spacing rules that used to target `.gatsby-highlight` still apply
//   - inserts a copy button before the wrapper; the click handler
//     (`copyCodeToClipboard`, defined in Layout.astro) reads the code text
//     from `this.parentNode.nextElementSibling`

const languageOf = (pre: Element): string => {
  const code = pre.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "code"
  );
  for (const target of [code, pre]) {
    const className = target?.properties?.className;
    if (Array.isArray(className)) {
      const language = className
        .map((value) => String(value))
        .find((value) => value.startsWith("language-"));
      if (language) {
        return language.slice("language-".length);
      }
    }
  }
  return "";
};

const copyButton = (): Element => ({
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
        "aria-pressed": "false",
        onclick: "copyCodeToClipboard(this, this.parentNode.nextElementSibling)",
      },
      children: [{ type: "text", value: "Copy" }],
    },
  ],
});

export const rehypeCodeBlock = () => (tree: Root) => {
  visit(tree, "element", (node, index, parent) => {
    if (!parent || typeof index !== "number" || node.tagName !== "pre") {
      return undefined;
    }
    const hasCode = node.children.some(
      (child) => child.type === "element" && child.tagName === "code"
    );
    if (!hasCode) {
      return undefined;
    }
    const language = languageOf(node);
    const wrapper: Element = {
      type: "element",
      tagName: "div",
      properties: {
        className: ["code-block"],
        ...(language ? { dataLanguage: language } : {}),
      },
      children: [node],
    };
    parent.children.splice(index, 1, copyButton(), wrapper);
    // continue after the inserted nodes
    return index + 2;
  });
};
