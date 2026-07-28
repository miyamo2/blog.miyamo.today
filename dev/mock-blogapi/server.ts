import { join } from "node:path";
import { GraphQLSchema, graphql } from "graphql";
import { buildMockDataSet } from "./data";
import { buildGitHubRootValue, buildGitHubSchema } from "./github";
import { placeholderPng } from "./png";
import { buildRootValue } from "./resolvers";
import { loadBlogApiSchema } from "./schema";

const port = Number(process.env.MOCK_BLOGAPI_PORT ?? 4000);
const baseUrl = `http://localhost:${port}`;

const blogApiSchema = loadBlogApiSchema(
  join(import.meta.dir, "../../.graphql/blogapi.miyamo.today")
);
const data = buildMockDataSet(baseUrl);
const blogApiRootValue = buildRootValue(data);

const gitHubSchema = buildGitHubSchema();
const gitHubRootValue = buildGitHubRootValue(baseUrl);

const pngCache = new Map<string, Uint8Array>();

interface GraphQLRequestBody {
  query?: string;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
}

const handleGraphQL = async (
  body: GraphQLRequestBody,
  schema: GraphQLSchema,
  rootValue: object,
  endpoint: string
): Promise<Response> => {
  if (!body.query) {
    return Response.json({ errors: [{ message: "Must provide query string." }] }, { status: 400 });
  }
  const result = await graphql({
    schema,
    source: body.query,
    variableValues: body.variables ?? undefined,
    operationName: body.operationName ?? undefined,
    rootValue,
  });
  const operation = body.operationName ?? body.query.trim().slice(0, 60).replace(/\s+/g, " ");
  console.log(
    `${new Date().toISOString()} POST ${endpoint} ${operation}${result.errors ? ` errors=${result.errors.length}` : ""}`
  );
  if (result.errors) {
    for (const error of result.errors) {
      console.error(`  error: ${error.message}`);
    }
  }
  return Response.json(result);
};

const graphQLRequestFromGet = (url: URL): GraphQLRequestBody => ({
  query: url.searchParams.get("query") ?? undefined,
  variables: url.searchParams.has("variables")
    ? (JSON.parse(url.searchParams.get("variables") ?? "{}") as Record<string, unknown>)
    : undefined,
  operationName: url.searchParams.get("operationName"),
});

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const isGitHub = url.pathname.startsWith("/github");
    const schema = isGitHub ? gitHubSchema : blogApiSchema;
    const rootValue = isGitHub ? gitHubRootValue : blogApiRootValue;
    const endpoint = isGitHub ? "/github/graphql" : "/graphql";

    if (request.method === "GET" && url.pathname.startsWith("/images/")) {
      const name = url.pathname.slice("/images/".length);
      let png = pngCache.get(name);
      if (!png) {
        png = name.startsWith("avatar-") ? placeholderPng(name, 460, 460) : placeholderPng(name);
        pngCache.set(name, png);
      }
      return new Response(png, {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
      });
    }

    if (request.method === "POST") {
      let body: GraphQLRequestBody;
      try {
        body = (await request.json()) as GraphQLRequestBody;
      } catch {
        return Response.json({ errors: [{ message: "invalid JSON body" }] }, { status: 400 });
      }
      return handleGraphQL(body, schema, rootValue, endpoint);
    }

    // convenience: GET /graphql?query={...} for quick checks from a browser
    if (request.method === "GET" && url.searchParams.has("query")) {
      return handleGraphQL(graphQLRequestFromGet(url), schema, rootValue, endpoint);
    }

    return new Response(
      [
        "mock blogapi.miyamo.today + GitHub GraphQL API",
        "",
        `blogapi endpoint : POST ${baseUrl}/graphql`,
        `github endpoint  : POST ${baseUrl}/github/graphql`,
        `placeholder image: GET  ${baseUrl}/images/<name>.png`,
        "",
        `articles: ${data.articles.length}, tags: ${data.tags.length}`,
        "",
        "example:",
        `  curl -s ${baseUrl}/graphql -H 'Content-Type: application/json' \\`,
        `    -d '{"query":"{ articles(first: 3) { edges { node { id title } } totalCount } }"}'`,
      ].join("\n"),
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  },
});

console.log(`mock blogapi.miyamo.today listening on ${baseUrl}`);
console.log(`  articles: ${data.articles.length}, tags: ${data.tags.length}`);
console.log("  set the following in .env.development:");
console.log(`    BLOG_API_MIYAMO_TODAY_URL=${baseUrl}/graphql`);
console.log(`    GITHUB_GRAPHQL_API_URL=${baseUrl}/github/graphql`);

export type MockServer = typeof server;
