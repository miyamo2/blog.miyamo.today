import type { Thing, WithContext, WebSite } from "schema-dts";
import { siteMetadata } from "./site";

/** every schema.org type name known to schema-dts (e.g. "WebSite", "ItemList") */
type SchemaType = Exclude<Thing, string>["@type"];

/** a JSON-LD node; kept loose because the builder assembles it dynamically */
export type JSONLD = Record<string, unknown> & { "@type": SchemaType };

/**
 * Absolute URL for a site-relative path. siteUrl carries no trailing slash, so a
 * path without a leading one would otherwise be glued onto the host
 * ("articles/x" -> "https://blog.miyamo.todayarticles/x").
 */
const absoluteUrl = (path?: string): string => {
  if (!path) {
    return `${siteMetadata.siteUrl}/`;
  }
  return `${siteMetadata.siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
};

interface BuildJSONLDParams {
  path?: string;
  type?: SchemaType;
  headline?: string;
  description?: string;
  image?: string;
  attributes?: Record<string, unknown>;
  withSiteName?: boolean;
  withMainEntityOfPage?: boolean;
  withUrl?: boolean;
  withContext?: boolean;
  withAuthor?: boolean;
  withLogo?: boolean;
  withID?: boolean;
}

// port of src/hooks/useJSONLD.tsx (no React hooks needed anymore)
export const buildJSONLD = ({
  path,
  type,
  headline,
  description,
  image,
  attributes,
  withSiteName,
  withMainEntityOfPage,
  withUrl,
  withContext,
  withAuthor,
  withLogo,
  withID,
}: BuildJSONLDParams): JSONLD => {
  const jsonLD: JSONLD = {
    "@type": type ?? "WebSite",
    ...attributes,
  };
  if (withContext) {
    jsonLD["@context"] = "https://schema.org";
  }
  if (withID) {
    jsonLD["@id"] = absoluteUrl(path);
  }
  if (headline) {
    jsonLD["headline"] = headline;
  }
  if (withSiteName) {
    jsonLD["name"] = siteMetadata.title || "";
  }
  if (description) {
    jsonLD["description"] = description;
  }
  if (withMainEntityOfPage) {
    jsonLD["mainEntityOfPage"] = {
      "@type": type ?? "WebSite",
      "@id": absoluteUrl(path),
    };
  }
  if (withUrl) {
    jsonLD["url"] = absoluteUrl(path);
  }
  if (image) {
    jsonLD["image"] = {
      "@type": "ImageObject",
      url: absoluteUrl(image),
    };
  }
  if (withAuthor) {
    jsonLD["author"] = {
      "@type": "Person",
      name: "miyamo2",
      url: absoluteUrl("/about"),
      sameAs: [
        "https://github.com/miyamo2",
        "https://zenn.dev/miyamo2",
        "https://twitter.com/miyamo2_jp",
        "https://speakerdeck.com/miyamo2",
        "https://qiita.com/miyamo2",
        "https://connpass.com/user/miyamo2/",
        "https://medium.com/@miyamo2",
        "https://dev.to/miyamo2",
        "https://note.com/miyamo2",
        "https://www.npmjs.com/~miyamo2",
        "https://pypi.org/user/miyamo2theppl/",
      ],
    };
  }
  if (withLogo) {
    jsonLD["logo"] = {
      "@type": "ImageObject",
      url: absoluteUrl(siteMetadata.icon),
      width: 65,
      height: 65,
    };
  }
  return jsonLD;
};

export const buildWebSiteJSONLD = (): WithContext<WebSite> => {
  return buildJSONLD({
    type: "WebSite",
    withContext: true,
    withUrl: true,
    withSiteName: true,
    withLogo: true,
    attributes: {
      alternateName: "blog miyamo today",
    },
  }) as unknown as WithContext<WebSite>;
};
