import { siteMetadata } from "./site";

interface BuildJSONLDParams {
  path?: string;
  type?: string;
  headline?: string;
  description?: string;
  image?: string;
  attributes?: Record<string, any>;
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
}: BuildJSONLDParams): Record<string, any> => {
  const jsonLD = {
    "@type": type ?? "WebSite",
    ...attributes,
  } as Record<string, any>;
  if (withContext) {
    jsonLD["@context"] = "https://schema.org";
  }
  if (withID) {
    jsonLD["@id"] = path ? `${siteMetadata.siteUrl}${path}` : `${siteMetadata.siteUrl}/`;
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
      "@id": path ? `${siteMetadata.siteUrl}${path}` : siteMetadata.siteUrl,
    };
  }
  if (withUrl) {
    jsonLD["url"] = path ? `${siteMetadata.siteUrl}${path}` : `${siteMetadata.siteUrl}/`;
  }
  if (image) {
    jsonLD["image"] = {
      "@type": "ImageObject",
      url: `${siteMetadata.siteUrl}${image}`,
    };
  }
  if (withAuthor) {
    jsonLD["author"] = {
      "@type": "Person",
      name: "miyamo2",
      url: `${siteMetadata.siteUrl}/about/`,
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
      url: `${siteMetadata.siteUrl}${siteMetadata.icon}`,
      width: 65,
      height: 65,
    };
  }
  return jsonLD;
};

export const buildWebSiteJSONLD = (): Record<string, any> => {
  return buildJSONLD({
    type: "WebSite",
    withContext: true,
    withUrl: true,
    withSiteName: true,
    withLogo: true,
    attributes: {
      alternateName: "blog miyamo today",
    },
  });
};
