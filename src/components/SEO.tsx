import { useSiteMetaData } from "@/hooks/UseSiteMetaData";
import React, { FC } from "react";
import { Helmet } from "react-helmet";

interface SeoProps {
    title?: string;
    description?: string;
    path?: string;
    lang?: string;
    image?: string;
}

const SEO: FC<SeoProps> = ({ path, title, description, image, lang }: SeoProps) => {
    const siteMetaData = useSiteMetaData()
    if (!siteMetaData) {
        throw new Error("SiteMetaData must not be null|undefined")
    }
    const {
        title: defaultTitle,
        description: defaultDescription,
        siteUrl: defaultSiteUrl,
        lang: defaultLang,
        image: defaultImage,
        icon,
        twitterUsername,
    } = siteMetaData

    const seo = {
        title: defaultTitle ? title ? `${title} | ${defaultTitle}` : defaultTitle : "",
        description: description ?? defaultDescription ?? "",
        url: defaultSiteUrl ? path ? `${defaultSiteUrl}${path}` : defaultSiteUrl : "",
        lang: lang ?? defaultLang ?? "ja",
        image: image ?? `${defaultSiteUrl}${defaultImage}` ?? "",
        icon: icon ?? "",
        twitterUsername: twitterUsername ?? "",
    }

    return (
        <Helmet>
            <title>{seo.title}</title>
            <meta name="description" content={seo.description}/>
            <meta property="og:title" content={seo.title}/>
            <meta property="og:site_name" content={defaultTitle ?? ""}/>
            <meta property="og:description" content={seo.description}/>
            <meta property="og:url" content={seo.url}/>
            <meta property="og:type" content="website"/>
            <meta property="og:image" content={seo.image}/>
            <meta name="twitter:creator" content={seo.twitterUsername}/>
            <meta name="twitter:title" content={seo.title}/>
            <meta name="twitter:description" content={seo.description}/>
            <meta name="twitter:image" content={seo.image}/>
            <meta name="twitter:url" content={seo.url}/>
            <meta name="twitter:card" content="summary_large_image"/>
            <link rel={"icon"} href={`${defaultSiteUrl}${icon}`} />
        </Helmet>
    )
}

export default SEO;
