import { IMockStore, addMocksToSchema, isRef } from "@graphql-tools/mock";
import { GraphQLSchema, buildSchema } from "graphql";

/**
 * Minimal subset of the GitHub GraphQL API schema, covering only what this
 * site queries: `user { login url bio avatarUrl socialAccounts { nodes { url } } }`.
 * Fields added to this SDL without seed data get auto-generated mock values.
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

// urls chosen so about.tsx's SocialAccountLink renders its zenn/qiita/speakerdeck icons
const SOCIAL_ACCOUNTS = [
  { displayName: "Zenn", provider: "GENERIC", url: "https://zenn.dev/miyamo2" },
  { displayName: "Qiita", provider: "GENERIC", url: "https://qiita.com/miyamo2" },
  { displayName: "Speaker Deck", provider: "GENERIC", url: "https://speakerdeck.com/miyamo2" },
  { displayName: "X", provider: "TWITTER", url: "https://x.com/miyamo2_jp" },
];

export const buildMockedGitHubSchema = (imageBaseUrl: string): GraphQLSchema =>
  addMocksToSchema({
    schema: buildSchema(GITHUB_SCHEMA_SDL),
    mocks: {
      URI: () => `${imageBaseUrl}/images/auto-generated.png`,
    },
    resolvers: (store: IMockStore) => {
      const userRef = (login: string) => {
        store.set("User", login, {
          login,
          name: `${login} (mock)`,
          bio: "開発用モックのプロフィールです。バックエンドとインフラが好きです。",
          url: `https://github.com/${login}`,
        });
        return store.get("User", login);
      };
      const loginOf = (source: unknown): string =>
        isRef(source) ? `${source.$ref.key}` : `${(source as { login: string }).login}`;

      return {
        Query: {
          user: (_: unknown, { login }: { login: string }) => userRef(login),
          viewer: () => userRef("miyamo2"),
        },
        User: {
          avatarUrl: (source: unknown) => `${imageBaseUrl}/images/avatar-${loginOf(source)}.png`,
          socialAccounts: (
            _: unknown,
            { first, last }: { first?: number | null; last?: number | null }
          ) => {
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
        },
      };
    },
  });
