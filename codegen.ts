import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: ".graphql/githubapi/**/*.graphqls",
  documents: ["github-profile.graphql"],
  generates: {
    "./src/generates/graphql.ts": {
      plugins: ["typescript", "typescript-operations", "typescript-graphql-request"],
      config: {
        skipTypename: false,
        withHOC: false,
        withComponent: false,
        scalars: {
          DateTime: "string",
          URI: "string",
        },
      },
    },
  },
};

export default config;
