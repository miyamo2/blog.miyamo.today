import type { APIRoute } from "astro";
import RSS from "rss";
import { getContent } from "../../lib/content";
import { siteMetadata } from "../../lib/site";

// port of the gatsby-plugin-feed configuration in gatsby-config.ts
export const GET: APIRoute = async () => {
  const { rssItems } = await getContent();

  const feed = new RSS({
    title: "blog.miyamo.today :: RSS feed",
    description: siteMetadata.description,
    site_url: "https://blog.miyamo.today",
    feed_url: "https://blog.miyamo.today/feed/rss.xml",
    language: "ja",
    generator: siteMetadata.title,
    custom_namespaces: { media: "http://search.yahoo.com/mrss/" },
  });

  for (const item of rssItems) {
    feed.item({
      title: item.title ?? siteMetadata.title,
      description: item.description ?? siteMetadata.description,
      date: new Date(item.createdAt ?? "1970-01-01").toUTCString(),
      url: `${siteMetadata.siteUrl}/articles/${item.id ?? ""}`,
      guid: `${siteMetadata.siteUrl}/articles/${item.id ?? ""}`,
      author: "miyamo2",
      custom_elements: [
        {
          "media:content": {
            _attr: {
              url: `${siteMetadata.siteUrl}/static/ogp.png`,
              width: 1200,
              height: 630,
              media: "image",
            },
          },
        },
      ],
    });
  }

  return new Response(feed.xml(), {
    headers: {
      "Content-Type": "application/rss+xml",
    },
  });
};
