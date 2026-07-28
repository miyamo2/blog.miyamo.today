import { GraphQLClient, gql } from "graphql-request";

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

interface GetAllArticlesResponse {
  articles: {
    edges: {
      cursor: string;
      node: {
        id: string;
        title: string;
        thumbnailUrl: string;
        content: string;
        createdAt: string;
        updatedAt: string;
        tags: {
          edges: {
            cursor: string;
            node: { name: string };
          }[];
        };
      };
    }[];
    totalCount: number;
  };
}

interface GetAllTagsResponse {
  tags: {
    edges: {
      cursor: string;
      node: {
        id: string;
        name: string;
        articles: {
          edges: { cursor: string }[];
          totalCount: number;
        };
      };
    }[];
  };
}

const GET_ALL_ARTICLES = gql`
  query GetAllArticles {
    articles(last: 2147483647) {
      edges {
        cursor
        node {
          id
          title
          thumbnailUrl
          content
          createdAt
          updatedAt
          tags {
            edges {
              cursor
              node {
                name
              }
            }
          }
        }
      }
      totalCount
    }
  }
`;

const GET_ALL_TAGS = gql`
  query GetAllTags {
    tags {
      edges {
        cursor
        node {
          id
          name
          articles {
            edges {
              cursor
            }
            totalCount
          }
        }
      }
    }
  }
`;

const blogApiClient = () => {
  const url = process.env.BLOG_API_MIYAMO_TODAY_URL;
  if (!url) {
    throw new Error(
      "BLOG_API_MIYAMO_TODAY_URL is not set. " +
        "Set it in .env.development / CI secrets, or run `bun run scripts/mock-api.mjs` for local development."
    );
  }
  return new GraphQLClient(url, {
    headers: {
      Authorization: `Bearer ${process.env.BLOG_API_MIYAMO_TODAY_TOKEN ?? ""}`,
    },
  });
};

let allArticlesPromise: Promise<{ articles: Article[]; totalCount: number }> | undefined;

/**
 * Fetches all articles keeping the edge order of `articles(last: 2147483647)`,
 * which the Gatsby build used to slice list pages.
 */
export const fetchAllArticles = () => {
  if (!allArticlesPromise) {
    allArticlesPromise = (async () => {
      const data = await blogApiClient().request<GetAllArticlesResponse>(GET_ALL_ARTICLES);
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
      const data = await blogApiClient().request<GetAllTagsResponse>(GET_ALL_TAGS);
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

interface GitHubProfileResponse {
  user: {
    login: string;
    avatarUrl: string;
    url: string;
    bio: string | null;
    socialAccounts: { nodes: { url: string }[] | null };
  } | null;
}

const GITHUB_PROFILE = gql`
  query GitHubProfile($loginId: String!) {
    user(login: $loginId) {
      login
      avatarUrl
      url
      bio
      socialAccounts(first: 10) {
        nodes {
          url
        }
      }
    }
  }
`;

let githubProfilePromise: Promise<GitHubProfile> | undefined;

export const fetchGitHubProfile = () => {
  if (!githubProfilePromise) {
    githubProfilePromise = (async () => {
      const endpoint = process.env.GITHUB_GRAPHQL_API_URL ?? "https://api.github.com/graphql";
      const client = new GraphQLClient(endpoint, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_API_TOKEN ?? ""}`,
        },
      });
      const data = await client.request<GitHubProfileResponse>(GITHUB_PROFILE, {
        loginId: "miyamo2",
      });
      if (!data || !data.user) {
        throw new Error("failed to get github user");
      }
      return {
        login: data.user.login,
        avatarUrl: data.user.avatarUrl,
        url: data.user.url,
        bio: data.user.bio ?? "",
        socialAccounts: data.user.socialAccounts.nodes ?? [],
      };
    })();
  }
  return githubProfilePromise;
};
