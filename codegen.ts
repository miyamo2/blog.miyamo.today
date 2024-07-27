import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: ".graphql/**/*.graphqls",
  documents: ["source-node.graphql", "github-avatar.graphql"],
  generates: {
    "./src/generates/graphql.ts": {
      plugins: ["typescript", "typescript-operations", "typescript-graphql-request"],
      config: {
        skipTypename: false,
        withHOC: false,
        withComponent: false, //出力するファイルを一つに設定する
        scalars: {
          uniqueidentifier: "string",
        },
      },
    },
  },
};

export default config;
