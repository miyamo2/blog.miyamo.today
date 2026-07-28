import { GraphQLClient } from "graphql-request";
import { getSdk } from "../generates/graphql";

// ---- blog API (blogapi.miyamo.today) ----------------------------------------

export interface ArticleTag {
  id: string;
  name: string;
}

export interface Article {
  id: string;
  title: string;
  thumbnailUrl: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: ArticleTag[];
}

export interface TagWithArticles {
  /** cursor of the tag edge (= path segment of /tags/xxx) */
  cursor: string;
  id: string;
  name: string;
  /** article cursors(= article ids) in the order returned by the API */
  articleIds: string[];
  totalCount: number;
}

const blogApiSdk = () => {
  const url = process.env.BLOG_API_MIYAMO_TODAY_URL;
  if (!url) {
    throw new Error(
      "BLOG_API_MIYAMO_TODAY_URL is not set. " +
        "Set it in .env.development / CI secrets, or run `bun run scripts/mock-api.mjs` for local development."
    );
  }
  return getSdk(
    new GraphQLClient(url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOG_API_MIYAMO_TODAY_TOKEN ?? ""}`,
      },
    })
  );
};

let allArticlesPromise: Promise<{ articles: Article[]; totalCount: number }> | undefined;

/**
 * Fetches all articles keeping the edge order of `articles(last: 2147483647)`,
 * which the Gatsby build used to slice list pages.
 */
export const fetchAllArticles = () => {
  if (!allArticlesPromise) {
    allArticlesPromise = (async () => {
      const data = await blogApiSdk().GetAllArticles();
      const articles = data.articles.edges.map((edge): Article => {
        const node = edge.node;
        return {
          id: node.id,
          title: node.title,
          thumbnailUrl: node.thumbnailUrl,
          content: node.content,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          tags: node.tags.edges.map((tagEdge) => ({
            id: tagEdge.cursor,
            name: tagEdge.node.name,
          })),
        };
      });
      return { articles, totalCount: data.articles.totalCount };
    })();
  }
  return allArticlesPromise;
};

let allTagsPromise: Promise<TagWithArticles[]> | undefined;

export const fetchAllTags = () => {
  if (!allTagsPromise) {
    allTagsPromise = (async () => {
      const data = await blogApiSdk().GetAllTags();
      return data.tags.edges.map((edge): TagWithArticles => {
        return {
          cursor: edge.cursor,
          id: edge.node.id,
          name: edge.node.name,
          articleIds: edge.node.articles.edges.map((articleEdge) => articleEdge.cursor),
          totalCount: edge.node.articles.totalCount,
        };
      });
    })();
  }
  return allTagsPromise;
};

// ---- GitHub API -------------------------------------------------------------

export interface GitHubProfile {
  login: string;
  avatarUrl: string;
  url: string;
  bio: string;
  socialAccounts: { url: string }[];
}

let githubProfilePromise: Promise<GitHubProfile> | undefined;

export const fetchGitHubProfile = () => {
  if (!githubProfilePromise) {
    githubProfilePromise = (async () => {
      const endpoint = process.env.GITHUB_GRAPHQL_API_URL ?? "https://api.github.com/graphql";
      const sdk = getSdk(
        new GraphQLClient(endpoint, {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_API_TOKEN ?? ""}`,
          },
        })
      );
      const data = await sdk.GitHubProfile({ loginId: "miyamo2" });
      if (!data || !data.user) {
        throw new Error("failed to get github user");
      }
      return {
        login: data.user.login,
        avatarUrl: data.user.avatarUrl,
        url: data.user.url,
        bio: data.user.bio ?? "",
        socialAccounts: (data.user.socialAccounts.nodes ?? []).filter(
          (node): node is { __typename?: "SocialAccount"; url: string } => node !== null
        ),
      };
    })();
  }
  return githubProfilePromise;
};
