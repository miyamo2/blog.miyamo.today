import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: ".graphql/**/*.graphqls",
  documents: ["blog-api.graphql", "github-profile.graphql"],
  generates: {
    "./src/generates/graphql.ts": {
      plugins: ["typescript", "typescript-operations", "typescript-graphql-request"],
      config: {
        skipTypename: false,
        withHOC: false,
        withComponent: false,
        scalars: {
          uniqueidentifier: "string",
          Markdown: "string",
          URL: "string",
          DateTime: "string",
          URI: "string",
        },
      },
    },
  },
};

export default config;
