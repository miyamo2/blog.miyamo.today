import path from "path";
import { CreateResolversArgs, GatsbyCache, GatsbyNode, Node } from "gatsby";
import { createRemoteFileNode } from "gatsby-source-filesystem";
import { request } from "graphql-request";
import {
  GitHubAvatarDocument,
  GitHubAvatarQuery,
  GitHubAvatarQueryVariables,
} from "./src/generates/graphql";

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

export const sourceNodes: GatsbyNode["sourceNodes"] = async ({ actions, cache }) => {
  const { createNode, createNodeField } = actions;
  await createGitHubAvatarNode(createNode, createNodeField, cache);
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
    throw new Error("failed to get github avatar");
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

export const createResolvers: GatsbyNode["createResolvers"] = async ({
  reporter,
  createResolvers,
}: CreateResolversArgs) => {
  reporter.info("createResolvers@blog.miyamo.today");
  createResolvers({
    MarkdownRemark: {
      thumbnail: {
        type: `File`,
        resolve: async (
          source: { frontmatter: { id: any } },
          args: any,
          context: {
            nodeModel: {
              findOne: (arg0: {
                type: string;
                query: { filter: { id: { eq: string } } };
              }) => Promise<Node | null>;
            };
          },
          info: any
        ) => {
          return await context.nodeModel.findOne({
            type: `File`,
            query: { filter: { id: { eq: `ArticleImage:${source.frontmatter.id}` } } },
          });
        },
      },
    },
  });
  reporter.success("createResolvers@blog.miyamo.today");
};

export const createPages: GatsbyNode["createPages"] = async ({ actions, graphql }) => {
  const { createPage, createRedirect } = actions;
  await articleListPage(createPage, createRedirect, graphql);
  await articleDetailPage(createPage, graphql);
  await taggedArticlesPage(createPage, createRedirect, graphql);
};

export interface ArticleListPageContext {
  perPage: number;
  totalItems: number;
  currentPage: number;
  markdownCursors: string[];
}

const articleListPage = async (
  createPage: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["actions"]["createPage"],
  createRedirect: Parameters<
    NonNullable<GatsbyNode["createPages"]>
  >["0"]["actions"]["createRedirect"],
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

    const ctx: ArticleListPageContext = {
      perPage: PER_PAGE,
      totalItems: totalArticles,
      currentPage: number,
      markdownCursors: cursors,
    };
    if (index === 0) {
      createPage({
        path: "/",
        component: path.resolve("./src/templates/article-list.tsx"),
        context: ctx,
      });
      createRedirect({
        fromPath: "/pages/1",
        toPath: "/",
        isPermanent: true,
      });
      return;
    }
    createPage({
      path: `/pages/${number}`,
      component: path.resolve("./src/templates/article-list.tsx"),
      context: ctx,
    });
    cursor = articlePageInfoEdges[number * PER_PAGE]?.cursor;
  });
};

export interface ArticleDetailPageContext {
  cursor: string;
}

const articleDetailPage = async (
  createPage: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["actions"]["createPage"],
  graphql: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["graphql"]
) => {
  const getAllArticles = await graphql<Queries.GetAllArticlesQuery>(`
    query GetAllArticles {
      allMarkdownRemark {
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
    };
    createPage({
      path: `/articles/${id}`,
      component: path.resolve("./src/templates/article-detail.tsx"),
      context,
    });
  });
};

export interface TaggedArticlesPageContext {
  tagID: string;
  tagName: string;
  perPage: number;
  totalItems: number;
  currentPage: number;
  markdownCursors: string[];
}

const taggedArticlesPage = async (
  createPage: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["actions"]["createPage"],
  createRedirect: Parameters<
    NonNullable<GatsbyNode["createPages"]>
  >["0"]["actions"]["createRedirect"],
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

        const ctx: TaggedArticlesPageContext = {
          tagID: tagId,
          tagName: tagName,
          perPage: PER_PAGE,
          totalItems: totalArticles,
          currentPage: number,
          markdownCursors: cursors,
        };
        if (index === 0) {
          createPage({
            path: `/tags/${tagId}`,
            component: path.resolve("./src/templates/tagged-articles.tsx"),
            context: ctx,
          });
          createRedirect({
            fromPath: `/tags/${tagId}/1`,
            toPath: `/tags/${tagId}`,
            isPermanent: true,
          });
          return;
        }
        createPage({
          path: `/tags/${tagId}/${number}`,
          component: path.resolve("./src/templates/tagged-articles.tsx"),
          context: ctx,
        });
      });
    });
};
