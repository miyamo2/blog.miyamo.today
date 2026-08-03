import { GraphQLClient } from "graphql-request";
import { getSdk } from "../generates/graphql";

// Articles and tags are both sourced through @miyamo2/astro-loader-blogapi-miyamo-today
// (see src/content.config.ts). This module covers the remaining query:
// the GitHub profile.

// ---- GitHub API -------------------------------------------------------------

interface GitHubProfile {
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
