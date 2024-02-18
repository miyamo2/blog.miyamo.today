import type { GatsbyConfig } from "gatsby"
import * as fs from "fs"
import {buildSchema} from "gatsby/graphql";

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
        typeName: "Miyamo2Blog",
        // Field under which the remote schema will be accessible. You'll use this in your Gatsby query
        fieldName: "miyamo2blog",
        // Url to query from
        url: process.env.URL,
      },
    },
    'gatsby-plugin-postcss',
  ],
}

export default config
