import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getContent } from "../../lib/content";
import { siteMetadata } from "../../lib/site";

// port of the gatsby-plugin-feed configuration in gatsby-config.ts,
// now built with Astro's standard @astrojs/rss package
export const GET: APIRoute = async (context) => {
  const { rssItems } = await getContent();

  return rss({
    title: "blog.miyamo.today :: RSS feed",
    description: siteMetadata.description,
    site: context.site ?? siteMetadata.siteUrl,
    trailingSlash: false,
    xmlns: {
      dc: "http://purl.org/dc/elements/1.1/",
      atom: "http://www.w3.org/2005/Atom",
      media: "http://search.yahoo.com/mrss/",
    },
    customData:
      `<language>ja</language>` +
      `<atom:link href="${siteMetadata.siteUrl}/feed/rss.xml" rel="self" type="application/rss+xml"/>`,
    items: rssItems.map((item) => ({
      title: item.title ?? siteMetadata.title,
      description: item.description ?? siteMetadata.description,
      pubDate: new Date(item.createdAt ?? "1970-01-01"),
      link: `/articles/${item.id ?? ""}`,
      customData:
        `<dc:creator><![CDATA[miyamo2]]></dc:creator>` +
        `<media:content url="${siteMetadata.siteUrl}/ogp.png" width="1200" height="630" media="image"/>`,
    })),
  });
};
