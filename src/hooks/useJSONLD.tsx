import { useSiteMetaData } from "./useSiteMetaData";

interface useJSONLDParams {
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

export const useJSONLD = ({
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
}: useJSONLDParams): Record<string, any> => {
  const siteMetaData = useSiteMetaData();
  if (!siteMetaData) {
    throw new Error("SiteMetaData must not be null|undefined");
  }

  const jsonLD = {
    "@type": type ?? "WebSite",
    ...attributes,
  } as Record<string, any>;
  if (withContext) {
    jsonLD["@context"] = "https://schema.org";
  }
  if (withID && path !== undefined) {
    jsonLD["@id"] = `${siteMetaData.siteUrl}${path}`;
  }
  if (headline) {
    jsonLD["headline"] = headline;
  }
  if (withSiteName) {
    jsonLD["name"] = siteMetaData.title || "";
  }
  if (description) {
    jsonLD["description"] = description;
  }
  if (withMainEntityOfPage) {
    jsonLD["mainEntityOfPage"] = {
      "@type": type ?? "WebSite",
      "@id": path ? `${siteMetaData.siteUrl}${path}` : siteMetaData.siteUrl,
    };
  }
  if (withUrl) {
    jsonLD["url"] = path ? `${siteMetaData.siteUrl}${path}` : siteMetaData.siteUrl;
  }
  if (image) {
    jsonLD["image"] = {
      "@type": "ImageObject",
      url: `${siteMetaData.siteUrl}${image}`,
    };
  }
  if (withAuthor) {
    jsonLD["author"] = {
      "@type": "Person",
      name: "miyamo2",
      url: `${siteMetaData.siteUrl}/about/`,
      sameAs: [
        "https://github.com/miyamo2",
        "https://zenn.dev/miyamo2",
        "https://speakerdeck.com/miyamo2",
        "https://qiita.com/miyamo2",
        "https://twitter.com/miyamo2_jp",
      ],
    };
  }
  if (withLogo) {
    jsonLD["logo"] = {
      "@type": "ImageObject",
      url: `${siteMetaData.siteUrl}${siteMetaData.icon}`,
      width: 65,
      height: 65,
    };
  }
  return jsonLD;
};
