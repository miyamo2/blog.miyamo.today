import type { GatsbyConfig } from "gatsby";
import { parse } from "@formkit/tempo";

require("dotenv").config({
  path: `.env.${process.env.NODE_ENV}`,
});

const config: GatsbyConfig = {
  siteMetadata: {
    title: "blog.miyamo.today",
    siteUrl: "https://blog.miyamo.today",
    description: "miyamo2's personal blog. How was miyamo2's today?",
    twitterUsername: "@miyamo2_jp",
    image: "/ogp.png",
    icon: "/logo.png",
    lang: "ja",
    facebookAppId: `${process.env.FACEBOOK_APP_ID}`,
  },
  // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
  // If you use VSCode you can also use the GraphQL plugin
  // Learn more at: https://gatsby.dev/graphql-typegen
  graphqlTypegen: true,
  plugins: [
    {
      resolve: "gatsby-source-graphql",
      options: {
        // Arbitrary name for the remote schema Query type
        typeName: "MiyamoToday",
        // Field under which the remote schema will be accessible. You'll use this in your Gatsby query
        fieldName: "miyamotoday",
        // Url to query from
        url: process.env.BLOG_API_MIYAMO_TODAY_URL,
        headers: {
          // Learn about environment variables: https://gatsby.dev/env-vars
          Authorization: `Bearer ${process.env.BLOG_API_MIYAMO_TODAY_TOKEN}`,
        },
      },
    },
    {
      resolve: "gatsby-source-graphql",
      options: {
        // Arbitrary name for the remote schema Query type
        typeName: "GitHub",
        // Field under which the remote schema will be accessible. You'll use this in your Gatsby query
        fieldName: "github",
        // Url to query from
        url: "https://api.github.com/graphql",
        headers: {
          // Learn about environment variables: https://gatsby.dev/env-vars
          Authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`,
        },
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `statics`,
        path: `${__dirname}/static/`,
      },
    },
    {
      resolve: `@miyamo2/gatsby-source-blogapi-miyamo-today`,
      options: {
        url: process.env.BLOG_API_MIYAMO_TODAY_URL,
        token: process.env.BLOG_API_MIYAMO_TODAY_TOKEN,
      },
    },
    "gatsby-plugin-postcss",
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        footnotes: true,
        gfm: true,
        plugins: [
          `gatsby-remark-autolink-headers`,
          `gatsby-remark-prismjs-copy-button`,
          {
            resolve: `gatsby-remark-prismjs`,
            options: {
              classPrefix: "language-",
              inlineCodeMarker: null,
              aliases: {},
              showLineNumbers: true,
              noInlineHighlight: false,
            },
          },
          {
            resolve: `gatsby-remark-images-remote`,
            options: {
              maxWidth: 800,
              withWebp: true,
              quality: 100,
              backgroundColor: `transparent`,
            },
          },
          `@okaryo/gatsby-remark-link-card`,
        ],
      },
    },
    `gatsby-plugin-tsconfig-paths`,
    {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        trackingIds: ["G-F1N7VJ0ZX9"],
        pluginConfig: {
          head: true,
        },
      },
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `blog.miyamo.today`,
        short_name: `blog.miyamo.today`,
        description: `miyamo2's personal blog; How was miyamo2's today?`,
        start_url: `/?homescreen`,
        background_color: `#ffffff`,
        theme_color: `#3f3a3a`,
        display: `standalone`,
        icon: `static/pwa_logo.png`,
      },
    },
    `gatsby-plugin-offline`,
    `gatsby-plugin-lodash`,
    `gatsby-plugin-fix-fouc`,
    {
      resolve: "gatsby-plugin-html-attributes",
      options: {
        lang: "ja",
      },
    },
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        query: `{
          site {
            siteMetadata {
              description
              siteUrl
              title
              site_url: siteUrl
            }
          }
        }`,
        setup: (options: any) => ({
          ...options,
          custom_namespaces: { media: "http://search.yahoo.com/mrss/" },
        }),
        feeds: [
          {
            serialize: ({
              query: { site, allMarkdownRemark },
            }: {
              query: { site: SiteMetadataForRSS; allMarkdownRemark: GetAllArticlesForRSS };
            }) => {
              return allMarkdownRemark.nodes.map((node) => {
                return {
                  title: node.frontmatter?.title ?? site?.siteMetadata?.title,
                  description: node.excerpt ?? site?.siteMetadata?.description,
                  date: parse(
                    node.frontmatter?.createdAt ?? "1970-01-01",
                    "YYYY-MM-DDTHH:mm:ssZ",
                    "en"
                  ).toUTCString(),
                  url: `${site?.siteMetadata?.siteUrl}/articles/${node.frontmatter?.id ?? ""}`,
                  guid: `${site?.siteMetadata?.siteUrl}/articles/${node.frontmatter?.id ?? ""}`,
                  author: "miyamo2",
                  custom_elements: [
                    {
                      "media:content": {
                        _attr: {
                          url: `${site?.siteMetadata?.siteUrl}/static/ogp.png`,
                          width: 1200,
                          height: 630,
                          media: "image",
                        },
                      },
                    },
                  ],
                };
              });
            },
            query: `query GetAllArticlesForRSS {
              allMarkdownRemark(
                sort: { frontmatter: { id: DESC } }
              ) {
                nodes {
                  excerpt(pruneLength: 140, truncate: true)
                  frontmatter {
                    id
                    title
                    createdAt
                    updatedAt
                  }
                }
              }
            }`,
            output: "/feed/rss.xml",
            title: "blog.miyamo.today :: RSS feed",
            feed_url: "https://blog.miyamo.today/feed/rss.xml",
            site_url: "https://blog.miyamo.today",
            language: "ja",
          },
        ],
      },
    },
    {
      resolve: `gatsby-plugin-s3`,
      options: {
        bucketName: process.env.BUCKET_NAME,
        removeNonexistentObjects: true,
        generateRoutingRules: false,
        enableS3StaticWebsiteHosting: false,
        generateIndexPageForRedirect: false,
        generateRedirectObjectsForPermanentRedirects: false,
        acl: null,
        params: {
          "*/*.webp": {
            CacheControl: "public, max-age=31536000, immutable",
          },
          "/page-data/**/.json": {
            ContentType: "application/json",
            CacheControl: "public, max-age=0, must-revalidate",
          },
          "*/index.html": {
            ContentType: "text/html",
            CacheControl: "public, max-age=0, must-revalidate",
          },
          "/*.webmanifest": {
            ContentType: "application/manifest+json",
            CacheControl: "public, max-age=0, must-revalidate",
          },
          "/workbox-v4.3.1/**": {
            ContentType: "application/javascript",
            CacheControl: "public, max-age=31536000, immutable",
          },
          "/~partytown/**": {
            ContentType: "application/javascript",
            CacheControl: "public, max-age=0, must-revalidate",
          },
          "/*.css": {
            ContentType: "text/css",
            CacheControl: "public, max-age=31536000, immutable",
          },
          "/webpack.stats.json": {
            ContentType: "application/json",
            CacheControl: "public, max-age=0, must-revalidate",
          },
          "/chunk-map.json": {
            ContentType: "application/json",
            CacheControl: "public, max-age=0, must-revalidate",
          },
          "/feed/rss.xml": {
            ContentType: "application/rss+xml",
            CacheControl: "public, max-age=0, must-revalidate",
          },
          "/sw.js": {
            ContentType: "application/javascript",
            CacheControl: "public, max-age=0, must-revalidate",
          },
          "/*.js": {
            ContentType: "application/javascript",
            CacheControl: "public, max-age=31536000, immutable",
          },
          "/*.js.map": {
            ContentType: "application/javascript",
            CacheControl: "public, max-age=31536000, immutable",
          },
          "sitemap-index.xml": {
            ContentType: "application/xml",
            CacheControl: "public, max-age=0, must-revalidate",
          },
          "sitemap-0.xml": {
            ContentType: "application/xml",
            CacheControl: "public, max-age=0, must-revalidate",
          },
        },
      },
    },
    {
      resolve: "gatsby-plugin-anchor-links",
    },
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-plugin-algolia`,
      options: {
        appId: process.env.GATSBY_ALGOLIA_APP_ID,
        apiKey: process.env.ALGOLIA_ADMIN_KEY,
        indexName: process.env.GATSBY_ALGOLIA_INDEX_NAME,
        queries: [
          {
            query: `{
              allMarkdownRemark {
                nodes {
                  excerpt(pruneLength: 3000, truncate: true)
                  frontmatter {
                    id
                    title
                    tags {
                      name
                    }
                    thumbnail
                    createdAt
                  }
                }
              }
              site {
                siteMetadata {
                  title
                  siteUrl
                  lang
                }
              }
            }`,
            transformer: ({
              data: { site, allMarkdownRemark },
            }: {
              data: { site: SiteMetadataForAlgolia; allMarkdownRemark: GetAllArticlesForAlgoria };
            }) =>
              allMarkdownRemark.nodes.flatMap((node) => {
                return {
                  id: node.frontmatter?.id ?? "",
                  content: node.excerpt ?? "",
                  title: node.frontmatter?.title ?? "",
                  publishedAt: parse(
                    node.frontmatter?.createdAt ?? "1970-01-01T00:00:00Z",
                    "YYYY-MM-DDTHH:mm:ssZ",
                    "en"
                  ),
                  tags: (() => {
                    return node.frontmatter?.tags
                      ?.filter((tag) => tag && typeof tag.name === "string" && tag.name.length > 0)
                      .flatMap((tag) => tag?.name ?? "")
                      .map((tagName) => tagName);
                  })(),
                  hierarchy: {
                    lvl0: site?.siteMetadata?.title ?? "",
                    lvl1: node.frontmatter?.title ?? "",
                  },
                  thumbnail: node.frontmatter?.thumbnail ?? "",
                  type: "lvl1",
                  url: `${site?.siteMetadata?.siteUrl ?? ""}/articles/${node.frontmatter?.id ?? ""}`,
                };
              }),
          },
        ],
        settings: {
          searchableAttributes: ["title", "content", "tags"],
          indexLanguages: ["ja"],
          queryLanguages: ["ja"],
          attributesToSnippet: [`content:10`],
        },
        mergeSettings: true,
        chunkSize: 10000,
        dryRun: process.env.ALGOLIA_DRY_RUN,
      },
    },
  ],
};

export default config;

interface GetAllArticlesForRSS {
  readonly nodes: ReadonlyArray<{
    excerpt: string | null;
    readonly frontmatter: {
      readonly id: string | null;
      readonly title: string | null;
      readonly createdAt: string | null;
      readonly updatedAt: string | null;
    } | null;
  }>;
}

interface GetAllArticlesForAlgoria {
  readonly nodes: ReadonlyArray<{
    excerpt: string | null;
    readonly frontmatter: {
      readonly id: string | null;
      readonly title: string | null;
      readonly thumbnail: string | null;
      readonly createdAt: string | null;
      readonly tags: ReadonlyArray<{
        readonly name: string | null;
      } | null> | null;
    } | null;
  }>;
}

interface SiteMetadataForRSS {
  readonly siteMetadata: {
    readonly title: string | null;
    readonly description: string | null;
    readonly siteUrl: string | null;
    readonly lang: string | null;
    readonly image: string | null;
    readonly icon: string | null;
    readonly twitterUsername: string | null;
    readonly facebookAppId: string | null;
  } | null;
}

interface SiteMetadataForAlgolia {
  readonly siteMetadata: {
    readonly title: string | null;
    readonly siteUrl: string | null;
    readonly lang: string | null;
  } | null;
}
