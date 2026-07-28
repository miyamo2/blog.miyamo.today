import { IMockStore, Ref, addMocksToSchema, isRef } from "@graphql-tools/mock";
import { GraphQLSchema } from "graphql";
import { MockArticle, MockDataSet, MockTag } from "./data";

interface ConnectionArgs {
  first?: number | null;
  last?: number | null;
  after?: string | null;
  before?: string | null;
}

// The real API uses the node id as the edge cursor; gatsby-node.ts relies on
// this to filter markdown nodes by `frontmatter.id in markdownCursors`.
const connection = <S extends { id: string }>(
  all: S[],
  args: ConnectionArgs,
  toNode: (source: S) => unknown
) => {
  let sliced = all;
  if (args.after != null) {
    const index = sliced.findIndex((item) => item.id === args.after);
    sliced = index >= 0 ? sliced.slice(index + 1) : sliced;
  }
  if (args.before != null) {
    const index = sliced.findIndex((item) => item.id === args.before);
    sliced = index >= 0 ? sliced.slice(0, index) : sliced;
  }
  let hasNextPage = false;
  let hasPreviousPage = false;
  if (args.first != null) {
    hasNextPage = sliced.length > args.first;
    sliced = sliced.slice(0, args.first);
  }
  if (args.last != null) {
    hasPreviousPage = sliced.length > args.last;
    sliced = args.last > 0 ? sliced.slice(-args.last) : [];
  }
  const edges = sliced.map((item) => ({ cursor: item.id, node: toNode(item) }));
  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor: sliced[0]?.id ?? "",
      endCursor: sliced[sliced.length - 1]?.id ?? "",
    },
    totalCount: all.length,
  };
};

const refKey = (source: unknown): string =>
  isRef(source) ? `${source.$ref.key}` : `${(source as { id: string }).id}`;

/**
 * Wraps the schema with @graphql-tools/mock: fields covered by the seed data
 * resolve deterministically, while any field the seed data does not know about
 * (e.g. one newly added to the schema submodule) gets an auto-generated dummy
 * value instead of a runtime error.
 */
export const buildMockedBlogApiSchema = (
  schema: GraphQLSchema,
  data: MockDataSet,
  imageBaseUrl: string
): GraphQLSchema =>
  addMocksToSchema({
    schema,
    mocks: {
      DateTime: () => "2026-01-01T12:00:00+09:00",
      URL: () => `${imageBaseUrl}/images/auto-generated.png`,
      Markdown: () => "スキーマに追加されたばかりのフィールドの自動生成モック値です。",
    },
    resolvers: (store: IMockStore) => {
      const articlesById = new Map(data.articles.map((article) => [article.id, article]));
      const tagsById = new Map(data.tags.map((tag) => [tag.id, tag]));
      const tagsOfArticle = (articleId: string): MockTag[] =>
        (articlesById.get(articleId)?.tagIds ?? []).flatMap((tagId) => tagsById.get(tagId) ?? []);
      const articlesOfTag = (tagId: string): MockArticle[] =>
        data.articles.filter((article) => article.tagIds.includes(tagId));

      // seed known fields; unknown fields fall back to the mock generators
      for (const article of data.articles) {
        const { tagIds, content, ...common } = article;
        store.set("ArticleNode", article.id, { ...common, content });
        store.set("TagArticleNode", article.id, common);
      }
      for (const tag of data.tags) {
        store.set("TagNode", tag.id, { id: tag.id, name: tag.name });
        store.set("ArticleTagNode", tag.id, { id: tag.id, name: tag.name });
      }

      const articleRef = (id: string): Ref => store.get("ArticleNode", id) as Ref;

      return {
        Query: {
          articles: (_: unknown, args: ConnectionArgs) =>
            connection(data.articles, args, (article) => articleRef(article.id)),
          article: (_: unknown, { id }: { id: string }) =>
            articlesById.has(id) ? articleRef(id) : null,
          tags: (_: unknown, args: ConnectionArgs) =>
            connection(data.tags, args, (tag) => store.get("TagNode", tag.id)),
          tag: (_: unknown, { id }: { id: string }) =>
            tagsById.has(id) ? store.get("TagNode", id) : null,
          node: (_: unknown, { id }: { id: string }) =>
            articlesById.has(id) ? articleRef(id) : null,
        },
        Mutation: {
          noop: (_: unknown, { input }: { input?: { clientMutationId?: string | null } | null }) => ({
            clientMutationId: input?.clientMutationId ?? null,
          }),
        },
        ArticleNode: {
          tags: (source: unknown, args: ConnectionArgs) =>
            connection(tagsOfArticle(refKey(source)), args, (tag) =>
              store.get("ArticleTagNode", tag.id)
            ),
        },
        TagNode: {
          articles: (source: unknown, args: ConnectionArgs) =>
            connection(articlesOfTag(refKey(source)), args, (article) =>
              store.get("TagArticleNode", article.id)
            ),
        },
        Node: {
          __resolveType: (source: unknown) =>
            isRef(source) ? source.$ref.typeName : (source as { __typename?: string })?.__typename,
        },
      };
    },
  });
