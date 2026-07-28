import { join } from "node:path";
import { graphql } from "graphql";
import { buildMockDataSet } from "./data";
import { placeholderPng } from "./png";
import { buildRootValue } from "./resolvers";
import { loadBlogApiSchema } from "./schema";

const port = Number(process.env.MOCK_BLOGAPI_PORT ?? 4000);
const baseUrl = `http://localhost:${port}`;

const schema = loadBlogApiSchema(join(import.meta.dir, "../../.graphql/blogapi.miyamo.today"));
const data = buildMockDataSet(baseUrl);
const rootValue = buildRootValue(data);

const pngCache = new Map<string, Uint8Array>();

interface GraphQLRequestBody {
  query?: string;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
}

const handleGraphQL = async (body: GraphQLRequestBody): Promise<Response> => {
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
    `${new Date().toISOString()} POST /graphql ${operation}${result.errors ? ` errors=${result.errors.length}` : ""}`
  );
  if (result.errors) {
    for (const error of result.errors) {
      console.error(`  error: ${error.message}`);
    }
  }
  return Response.json(result);
};

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname.startsWith("/images/")) {
      const name = url.pathname.slice("/images/".length);
      let png = pngCache.get(name);
      if (!png) {
        png = placeholderPng(name);
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
      return handleGraphQL(body);
    }

    // convenience: GET /graphql?query={...} for quick checks from a browser
    if (request.method === "GET" && url.searchParams.has("query")) {
      return handleGraphQL({
        query: url.searchParams.get("query") ?? undefined,
        variables: url.searchParams.has("variables")
          ? (JSON.parse(url.searchParams.get("variables") ?? "{}") as Record<string, unknown>)
          : undefined,
        operationName: url.searchParams.get("operationName"),
      });
    }

    return new Response(
      [
        "mock blogapi.miyamo.today",
        "",
        `GraphQL endpoint : POST ${baseUrl}/graphql`,
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
console.log(`  set BLOG_API_MIYAMO_TODAY_URL=${baseUrl}/graphql in .env.development`);

export type MockServer = typeof server;
