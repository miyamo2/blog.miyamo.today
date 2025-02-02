import { useSiteMetaData } from "../hooks/useSiteMetaData";
import React, { FC } from "react";

interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  lang?: string;
  image?: string;
  jsonLD?: Record<string, any>[];
}

const SEO: FC<SeoProps> = ({
  path,
  title,
  description,
  image,
  lang,
  jsonLD,
}: Partial<SeoProps>) => {
  const siteMetaData = useSiteMetaData();
  if (!siteMetaData) {
    throw new Error("SiteMetaData must not be null|undefined");
  }

  const {
    title: defaultTitle,
    description: defaultDescription,
    siteUrl: defaultSiteUrl,
    lang: defaultLang,
    image: defaultImage,
    icon,
    twitterUsername,
    facebookAppId,
  } = siteMetaData;

  const seo = {
    title: defaultTitle ? (title ? `${title} | ${defaultTitle}` : defaultTitle) : "",
    description: description ?? defaultDescription ?? "",
    url: defaultSiteUrl ? (path ? `${defaultSiteUrl}${path}` : defaultSiteUrl) : "",
    lang: lang ?? defaultLang ?? "ja_JP",
    image: image ? `${defaultSiteUrl}${image}` : `${defaultSiteUrl}${defaultImage}`,
    icon: icon ?? "",
    twitterUsername: twitterUsername ?? "",
    facebookAppId: facebookAppId ?? "",
  };

  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="author" content="miyamo2" />
      <meta property="og:title" content={seo.title} />
      <meta property="og:site_name" content={defaultTitle ?? ""} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={seo.image} />
      <meta property="og:locale" content={seo.lang} />
      <meta property="fb:app_id" content={seo.facebookAppId} />
      <meta name="twitter:creator" content={seo.twitterUsername} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
      <meta name="twitter:url" content={seo.url} />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel={"icon"} href={`${defaultSiteUrl}${icon}`} />
      {jsonLD?.map((obj) => <script type="application/ld+json">{JSON.stringify(obj)}</script>)}
    </>
  );
};

export default SEO;
