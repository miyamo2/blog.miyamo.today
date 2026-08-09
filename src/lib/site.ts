import { config } from "virtual:jsonld";

// Site metadata previously defined in gatsby-config.ts (siteMetadata).
//
// The name, the description and the url come from the jsonld integration, which
// resolves them from its own options and astro's `site`, so the meta tags and
// the structured data describe the same site.
export const siteMetadata = {
  title: config.name,
  siteUrl: config.siteUrl,
  description: config.description ?? "",
  twitterUsername: "@miyamo2_jp",
  image: "/ogp.png",
  icon: "/logo.png",
  lang: "ja",
  facebookAppId: `${import.meta.env.FACEBOOK_APP_ID ?? process.env.FACEBOOK_APP_ID ?? ""}`,
} as const;

export const PER_PAGE = (() => {
  const v = process.env.ARTICLE_PER_PAGE;
  if (!v) {
    return 24;
  }
  const num = parseInt(v);
  if (isNaN(num)) {
    return 24;
  }
  return num;
})();
