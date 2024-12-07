import type { GatsbyConfig } from "gatsby";

require("dotenv").config({
  path: `.env.${process.env.NODE_ENV}`,
});

const config: GatsbyConfig = {
  siteMetadata: {
    title: "blog.miyamo.today",
    siteUrl: "https://blog.miyamo.today",
    description: "How was miyamo.today?",
    twitterUsername: "@miyamo2_jp",
    image: "/ogp.png",
    icon: "/logo.png",
    lang: "ja",
    facebookAppId: `${process.env.FACEBOOK_APP_ID}`
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
        url: process.env.GITHUB_API_URL,
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
        ],
      },
    },
    `gatsby-plugin-tsconfig-paths`,
    {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        trackingIds: ["G-F1N7VJ0ZX9"],
        pluginConfig: {
          head: true
        }
      }
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `blog.miyamo.today`,
        short_name: `blog.miyamo.today`,
        description: `How was miyamo.today?`,
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
      resolve: 'gatsby-plugin-html-attributes',
      options: {
        lang: 'ja'
      }
    },
  ],
};

export default config;
