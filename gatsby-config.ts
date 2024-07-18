import type { GatsbyConfig } from "gatsby"
import path from "path";

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const config: GatsbyConfig = {

  siteMetadata: {},
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
        url: process.env.URL,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `statics`,
        path: `${__dirname}/static/`,
      },
    },
    'gatsby-plugin-postcss',
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        footnotes: true,
        gfm: true,
        plugins: [
          `gatsby-remark-line-breaks`,
          `gatsby-remark-table-of-contents`,
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
          }
        ],
      },
    },
    `gatsby-plugin-tsconfig-paths`
  ],
}

export default config
