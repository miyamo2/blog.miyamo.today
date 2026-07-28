// Site metadata previously defined in gatsby-config.ts (siteMetadata)
export const siteMetadata = {
  title: "blog.miyamo.today",
  siteUrl: "https://blog.miyamo.today",
  description:
    "miyamo2のブログ。体験したこと、考えていること、それとコードの断片をゆるく発信していきます。",
  twitterUsername: "@miyamo2_jp",
  image: "/ogp.png",
  icon: "/logo.png",
  lang: "ja",
  facebookAppId: `${import.meta.env.FACEBOOK_APP_ID ?? process.env.FACEBOOK_APP_ID ?? ""}`,
} as const;

export type SiteMetadata = typeof siteMetadata;

export const PER_PAGE = (() => {
  const v = process.env.ARTICLE_PER_PAGE ?? process.env.GATSBY_ARTICLE_PER_PAGE;
  if (!v) {
    return 24;
  }
  const num = parseInt(v);
  if (isNaN(num)) {
    return 24;
  }
  return num;
})();
