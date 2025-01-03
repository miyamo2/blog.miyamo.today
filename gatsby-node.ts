import path from "path";
import { GatsbyCache, GatsbyNode } from "gatsby";
import { createFileNodeFromBuffer, createRemoteFileNode } from "gatsby-source-filesystem";
import { request } from "graphql-request";
import { format } from "@formkit/tempo";
import {
  SourceNodesQuery,
  SourceNodesDocument,
  SourceNodesQueryVariables,
  GitHubAvatarQuery,
  GitHubAvatarDocument,
  GitHubAvatarQueryVariables,
} from "./src/generates/graphql";
import InputMaybe = Queries.InputMaybe;

const PER_PAGE = (() => {
  let v = process.env.GATSBY_ARTICLE_PER_PAGE;
  if (!v) {
    return 24;
  }
  const num = parseInt(v);
  if (isNaN(num)) {
    return 24;
  }
  return num;
})();

const range = (start: number, end: number) => [...Array(end - start + 1)].map((_, i) => start + i);

export const sourceNodes: GatsbyNode["sourceNodes"] = async ({
  actions,
  cache,
  createContentDigest,
}) => {
  const { createNode, createNodeField } = actions;
  await Promise.all(
    [
      createArticleContentAndImageNode(createNode, createNodeField, cache, createContentDigest),
      createGitHubAvatarNode(createNode, createNodeField, cache),
    ]
  )
};

const createArticleContentAndImageNode = async (
  createNode: Parameters<NonNullable<GatsbyNode["sourceNodes"]>>["0"]["actions"]["createNode"],
  createNodeField: Parameters<
    NonNullable<GatsbyNode["sourceNodes"]>
  >["0"]["actions"]["createNodeField"],
  cache: GatsbyCache,
  createContentDigest: Parameters<
    NonNullable<GatsbyNode["sourceNodes"]>
  >["0"]["createContentDigest"]
) => {
  const endpoint = process.env.BLOG_API_MIYAMO_TODAY_URL;
  if (!endpoint || typeof endpoint !== "string") {
    throw new Error("endpoint must not to be null or undefined");
  }

  let doContinue = true;
  let after: InputMaybe<string> | undefined = undefined;
  while (doContinue) {
    const data: SourceNodesQuery = await request<SourceNodesQuery, SourceNodesQueryVariables>(
      endpoint,
      SourceNodesDocument,
      {
        after: after,
        first: PER_PAGE,
      },
      {
        authorization: process.env.BLOG_API_MIYAMO_TODAY_TOKEN
          ? `Bearer ${process.env.BLOG_API_MIYAMO_TODAY_TOKEN}`
          : "",
      }
    );
    if (!data) {
      throw new Error("failed to get articles");
    }

    data.articles.edges.map(async (edge) => {
      const articleNode = edge.node;
      if (
        articleNode.thumbnailUrl === null ||
        articleNode.thumbnailUrl === undefined ||
        articleNode.thumbnailUrl.length === 0
      ) {
        return;
      }

      const thumbnailNode = await createRemoteFileNode({
        url: articleNode.thumbnailUrl,
        cache,
        createNode: createNode,
        createNodeId: (): string => {
          return `ArticleImage:${articleNode.id}`;
        },
      });

      createNodeField({
        node: thumbnailNode,
        name: "ArticleImage",
        value: "true",
      });

      createNodeField({
        node: thumbnailNode,
        name: "link",
        value: articleNode.thumbnailUrl,
      });

      const rawContent = articleNode.content.replaceAll(`\\n`, `\n`);
      const content = `---
id: "${articleNode.id}"
title: "${articleNode.title}"
createdAt: "${format(new Date(articleNode.createdAt), "YYYY-MM-DDTHH:mm:ssZ")}"
updatedAt: "${format(new Date(articleNode.updatedAt), "YYYY-MM-DDTHH:mm:ssZ")}"
thumbnail: "${articleNode.thumbnailUrl}"
tags: [${articleNode.tags.edges
        .map((edge) => {
          return `{"id": "${edge.cursor}", "name": "${edge.node.name}"}`;
        })
        .join(", ")}]
---
${rawContent}`;

      const contentNode = await createFileNodeFromBuffer({
        buffer: Buffer.from(content),
        cache,
        createNode,
        createNodeId: (): string => {
          return `ArticleContent:${articleNode.id}`;
        },
        hash: createContentDigest(content),
        ext: ".md",
      });

      createNodeField({
        node: contentNode,
        name: "ArticleContent",
        value: "true",
      });

      createNodeField({
        node: contentNode,
        name: "link",
        value: content,
      });
      return;
    });

    const { hasNextPage, endCursor } = data.articles.pageInfo;
    doContinue = hasNextPage ?? false;
    after = endCursor;
  }
};

const createGitHubAvatarNode = async (
  createNode: Parameters<NonNullable<GatsbyNode["sourceNodes"]>>["0"]["actions"]["createNode"],
  createNodeField: Parameters<
    NonNullable<GatsbyNode["sourceNodes"]>
  >["0"]["actions"]["createNodeField"],
  cache: GatsbyCache
) => {
  const endpoint = "https://api.github.com/graphql";

  const requestHeaders = {
    Authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`,
  };

  const data: GitHubAvatarQuery = await request<GitHubAvatarQuery, GitHubAvatarQueryVariables>(
    endpoint,
    GitHubAvatarDocument,
    {
      loginId: "miyamo2",
    },
    requestHeaders
  );
  if (!data || !data.user) {
    throw new Error("failed to get articles");
  }

  const avatarUrl = data.user.avatarUrl;
  const avatarNode = await createRemoteFileNode({
    url: avatarUrl,
    cache,
    createNode: createNode,
    createNodeId: (): string => {
      return `GitHubAvatar:miyamo2`;
    },
  });
  createNodeField({
    node: avatarNode,
    name: "link",
    value: avatarUrl,
  });
};

export const createPages: GatsbyNode["createPages"] = async ({ actions, graphql }) => {
  const { createPage } = actions;
  await Promise.all(
    [
      articleListPage(createPage, graphql),
      articleDetailPage(createPage, graphql),
      taggedArticlesPage(createPage, graphql),
    ])
};

export interface ArticleListPageContext {
  perPage: number;
  totalItems: number;
  currentPage: number;
  markdownCursors: string[];
  imageCursors: string[];
}

const articleListPage = async (
  createPage: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["actions"]["createPage"],
  graphql: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["graphql"]
) => {
  // TODO: partitional fetch by cursor
  const articlesPageInfoQuery = await graphql<Queries.GetArticlesPageInfoQuery>(`
    query GetArticlesPageInfo {
      miyamotoday {
        articles(last: 2147483647) {
          edges {
            cursor
          }
          totalCount
        }
      }
    }
  `);
  if (articlesPageInfoQuery.errors) {
    throw new Error("failed to get articles");
  }

  const articlesPageInfo = articlesPageInfoQuery.data;
  if (!articlesPageInfo) {
    throw new Error("faild to get articles count");
  }

  const articlePageInfoEdges = articlesPageInfo.miyamotoday.articles.edges;
  const totalArticles = articlesPageInfo.miyamotoday.articles.totalCount;

  let cursor: string | null = null;
  range(1, Math.ceil(totalArticles / PER_PAGE)).map((number, index) => {
    const cursors = articlePageInfoEdges
      .slice((number - 1) * PER_PAGE, number * PER_PAGE)
      .map((edge) => edge.cursor);

    const imageCursors = articlePageInfoEdges
      .slice((number - 1) * PER_PAGE, number * PER_PAGE)
      .map((edge) => `ArticleImage:${edge.cursor}`);

    const ctx: ArticleListPageContext = {
      perPage: PER_PAGE,
      totalItems: totalArticles,
      currentPage: number,
      markdownCursors: cursors,
      imageCursors: imageCursors,
    };
    if (index === 0) {
      createPage({
        path: "/",
        component: path.resolve("./src/templates/article-list.tsx"),
        context: ctx,
      });
    }
    createPage({
      path: `/pages/${number}`,
      component: path.resolve("./src/templates/article-list.tsx"),
      context: ctx,
    });
    cursor = articlePageInfoEdges[number * PER_PAGE]?.cursor;
  });
};

export interface ArticleDetailPageTag {
  id?: string;
  name?: string;
}

export interface ArticleDetailPageContext {
  cursor: string;
  imageCursor?: string;
}

const articleDetailPage = async (
  createPage: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["actions"]["createPage"],
  graphql: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["graphql"]
) => {
  const getAllArticles = await graphql<Queries.GetAllArticlesQuery>(`
    query GetAllArticles {
      allMarkdownRemark(filter: { frontmatter: { id: { ne: "Noop" } } }) {
        nodes {
          frontmatter {
            id
            tags {
              id
              name
            }
          }
        }
      }
    }
  `);

  if (!getAllArticles.data || getAllArticles.errors) {
    throw new Error("failed to get all article cursors");
  }
  const data = getAllArticles.data;
  data.allMarkdownRemark.nodes.forEach((edge) => {
    const id = edge.frontmatter?.id;
    if (!id) {
      return;
    }
    const context: ArticleDetailPageContext = {
      cursor: id,
      imageCursor: `ArticleImage:${id}`,
    };
    createPage({
      path: `/articles/${id}`,
      component: path.resolve("./src/templates/article-detail.tsx"),
      context,
    });
  });
};

export interface TaggedArticlesPageContext {
  tagName: string;
  perPage: number;
  totalItems: number;
  currentPage: number;
  markdownCursors: string[];
  imageCursors: string[];
}

const taggedArticlesPage = async (
  createPage: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["actions"]["createPage"],
  graphql: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["graphql"]
) => {
  const taggedArticlesPageInfoQuery = await graphql<Queries.GetTaggedArticlesPageInfoQuery>(`
    query GetTaggedArticlesPageInfo {
      miyamotoday {
        tags {
          edges {
            cursor
            node {
              articles {
                edges {
                  cursor
                }
                totalCount
              }
            }
            node {
              id
              name
            }
          }
        }
      }
    }
  `);
  if (taggedArticlesPageInfoQuery.errors || !taggedArticlesPageInfoQuery.data) {
    throw new Error("failed to get tagged articles");
  }

  const articlePageInfoEdges = taggedArticlesPageInfoQuery.data.miyamotoday.tags.edges;

  // TODO: support last paging of tag-articles in Backend
  articlePageInfoEdges
    .slice()
    .reverse()
    .map((tagEdge) => {
      const { id: tagId, name: tagName } = tagEdge.node;
      const { edges: articleEdges, totalCount: totalArticles } = tagEdge.node.articles;

      range(1, Math.ceil(totalArticles / PER_PAGE)).map((number, index) => {
        const cursors = articleEdges
          .slice((number - 1) * PER_PAGE, number * PER_PAGE)
          .map((edge) => edge.cursor);

        const imageCursors = articleEdges
          .slice((number - 1) * PER_PAGE, number * PER_PAGE)
          .map((edge) => `ArticleImage:${edge.cursor}`);

        const ctx: TaggedArticlesPageContext = {
          tagName: tagName,
          perPage: PER_PAGE,
          totalItems: totalArticles,
          currentPage: number,
          markdownCursors: cursors,
          imageCursors: imageCursors,
        };
        if (index === 0) {
          createPage({
            path: `/tags/${tagId}`,
            component: path.resolve("./src/templates/tagged-articles.tsx"),
            context: ctx,
          });
        }
        createPage({
          path: `/tags/${tagId}/${number}/`,
          component: path.resolve("./src/templates/tagged-articles.tsx"),
          context: ctx,
        });
      });
    });
};
