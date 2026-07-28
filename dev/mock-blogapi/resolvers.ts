import { MockArticle, MockDataSet, MockTag } from "./data";

interface ConnectionArgs {
  first?: number | null;
  last?: number | null;
  after?: string | null;
  before?: string | null;
}

interface Edge<T> {
  cursor: string;
  node: T;
}

interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
  totalCount: number;
}

// The real API uses the node id as the edge cursor; gatsby-node.ts relies on
// this to filter markdown nodes by `frontmatter.id in markdownCursors`.
const connection = <S extends { id: string }, T>(
  all: S[],
  args: ConnectionArgs,
  toNode: (source: S) => T
): Connection<T> => {
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
      startCursor: edges[0]?.cursor ?? "",
      endCursor: edges[edges.length - 1]?.cursor ?? "",
    },
    totalCount: all.length,
  };
};

/**
 * Root value for graphql-js' default field resolver: connection fields are
 * functions so they receive their (first/last/after/before) arguments.
 */
export const buildRootValue = (data: MockDataSet) => {
  const tagsById = new Map(data.tags.map((tag) => [tag.id, tag]));
  const articlesByTagId = (tagId: string): MockArticle[] =>
    data.articles.filter((article) => article.tagIds.includes(tagId));

  const articleTagNode = (tag: MockTag) => ({
    __typename: "ArticleTagNode",
    id: tag.id,
    name: tag.name,
  });

  const articleNode = (article: MockArticle) => ({
    __typename: "ArticleNode",
    id: article.id,
    title: article.title,
    content: article.content,
    thumbnailUrl: article.thumbnailUrl,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    tags: (args: ConnectionArgs) =>
      connection(
        article.tagIds.flatMap((tagId) => tagsById.get(tagId) ?? []),
        args,
        articleTagNode
      ),
  });

  const tagArticleNode = (article: MockArticle) => ({
    __typename: "TagArticleNode",
    id: article.id,
    title: article.title,
    thumbnailUrl: article.thumbnailUrl,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  });

  const tagNode = (tag: MockTag) => ({
    __typename: "TagNode",
    id: tag.id,
    name: tag.name,
    articles: (args: ConnectionArgs) => connection(articlesByTagId(tag.id), args, tagArticleNode),
  });

  return {
    articles: (args: ConnectionArgs) => connection(data.articles, args, articleNode),
    article: ({ id }: { id: string }) => {
      const article = data.articles.find((a) => a.id === id);
      return article ? articleNode(article) : null;
    },
    tags: (args: ConnectionArgs) => connection(data.tags, args, tagNode),
    tag: ({ id }: { id: string }) => {
      const tag = tagsById.get(id);
      return tag ? tagNode(tag) : null;
    },
    node: ({ id }: { id: string }) => {
      const article = data.articles.find((a) => a.id === id);
      return article ? articleNode(article) : null;
    },
    noop: ({ input }: { input?: { clientMutationId?: string | null } | null }) => ({
      clientMutationId: input?.clientMutationId ?? null,
    }),
  };
};
