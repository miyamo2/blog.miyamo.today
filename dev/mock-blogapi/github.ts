import { GraphQLSchema, buildSchema } from "graphql";

/**
 * Minimal subset of the GitHub GraphQL API schema, covering only what this
 * site queries: `user { login url bio avatarUrl socialAccounts { nodes { url } } }`.
 */
const GITHUB_SCHEMA_SDL = /* GraphQL */ `
  scalar URI

  type Query {
    user(login: String!): User
    viewer: User!
  }

  type User {
    login: String!
    name: String
    bio: String
    url: URI!
    avatarUrl(size: Int): URI!
    socialAccounts(
      after: String
      before: String
      first: Int
      last: Int
    ): SocialAccountConnection!
  }

  enum SocialAccountProvider {
    BLUESKY
    FACEBOOK
    GENERIC
    INSTAGRAM
    LINKEDIN
    MASTODON
    NPM
    REDDIT
    TWITCH
    TWITTER
    YOUTUBE
  }

  type SocialAccount {
    displayName: String!
    provider: SocialAccountProvider!
    url: URI!
  }

  type SocialAccountConnection {
    nodes: [SocialAccount]
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type PageInfo {
    endCursor: String
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
  }
`;

export const buildGitHubSchema = (): GraphQLSchema => buildSchema(GITHUB_SCHEMA_SDL);

// urls chosen so about.tsx's SocialAccountLink renders its zenn/qiita/speakerdeck icons
const SOCIAL_ACCOUNTS = [
  { displayName: "Zenn", provider: "GENERIC", url: "https://zenn.dev/miyamo2" },
  { displayName: "Qiita", provider: "GENERIC", url: "https://qiita.com/miyamo2" },
  { displayName: "Speaker Deck", provider: "GENERIC", url: "https://speakerdeck.com/miyamo2" },
  { displayName: "X", provider: "TWITTER", url: "https://x.com/miyamo2_jp" },
];

export const buildGitHubRootValue = (imageBaseUrl: string) => {
  const user = (login: string) => ({
    login,
    name: `${login} (mock)`,
    bio: "開発用モックのプロフィールです。バックエンドとインフラが好きです。",
    url: `https://github.com/${login}`,
    avatarUrl: () => `${imageBaseUrl}/images/avatar-${login}.png`,
    socialAccounts: ({ first, last }: { first?: number | null; last?: number | null }) => {
      let nodes = SOCIAL_ACCOUNTS;
      if (first != null) {
        nodes = nodes.slice(0, first);
      }
      if (last != null) {
        nodes = nodes.slice(-last);
      }
      return {
        nodes,
        totalCount: SOCIAL_ACCOUNTS.length,
        pageInfo: {
          startCursor: null,
          endCursor: null,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    },
  });

  return {
    user: ({ login }: { login: string }) => user(login),
    viewer: () => user("miyamo2"),
  };
};
