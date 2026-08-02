// Local development / build-verification mock for:
//   - blogapi.miyamo.today (GraphQL)      -> http://localhost:8787/graphql
//   - GitHub GraphQL API                  -> http://localhost:8787/github
//   - article images                      -> http://localhost:8787/img/:name
//
// Usage:
//   node scripts/mock-api.mjs &
//   BLOG_API_MIYAMO_TODAY_URL=http://localhost:8787/graphql \
//   GITHUB_GRAPHQL_API_URL=http://localhost:8787/github \
//   bun run build
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const PORT = process.env.MOCK_API_PORT ? parseInt(process.env.MOCK_API_PORT) : 8787;

const articleContent = (n) => `
## はじめに

これはモック記事${n}の本文です。ビルド検証用のダミーテキストです。
コードブロックや画像、テーブルなどの要素を含みます。

## コード例

\`\`\`go
package main

import "fmt"

func main() {
	fmt.Println("Hello, blog.miyamo.today!")
}
\`\`\`

インラインコードは \`fmt.Println\` のように表示されます。

## 画像

![サンプル画像](http://localhost:${PORT}/img/article-${n}.png)

## リンクカード

http://mock-ogp.example.com:${PORT}/ogp-page

## テーブル

| 列A | 列B |
| --- | --- |
| a   | b   |

## おわりに

脚注も使えます[^1]。

[^1]: これは脚注です。
`;

const articles = [1, 2, 3, 4].map((n) => ({
  id: `${1000000 + n}`,
  title: `モック記事タイトル ${n}`,
  thumbnailUrl: `http://localhost:${PORT}/img/thumb-${n}.png`,
  content: articleContent(n),
  createdAt: `2025-01-0${n}T12:00:00+09:00`,
  updatedAt: `2025-01-0${n}T15:00:00+09:00`,
  tags:
    n % 2 === 0
      ? [
          { cursor: "Go", name: "Go" },
          { cursor: "AWS", name: "AWS" },
        ]
      : [{ cursor: "Go", name: "Go" }],
}));

const tags = [
  {
    cursor: "Go",
    id: "Go",
    name: "Go",
    articleIds: articles.map((a) => a.id),
  },
  {
    cursor: "AWS",
    id: "AWS",
    name: "AWS",
    articleIds: articles.filter((_, i) => (i + 1) % 2 === 0).map((a) => a.id),
  },
];

const blogApiResponse = (query) => {
  if (query.includes("articles(first:") || query.includes("articles(last:")) {
    // SourceNodes query of @miyamo2/astro-loader-blogapi-miyamo-today
    // (single page: hasNextPage=false)
    return {
      data: {
        articles: {
          edges: articles.map((a) => ({
            cursor: a.id,
            node: {
              id: a.id,
              title: a.title,
              thumbnailUrl: a.thumbnailUrl,
              content: a.content,
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
              tags: {
                edges: a.tags.map((t) => ({ cursor: t.cursor, node: { name: t.name } })),
              },
            },
          })),
          pageInfo: {
            hasNextPage: false,
            endCursor: articles.at(-1)?.id ?? "",
          },
          totalCount: articles.length,
        },
      },
    };
  }
  if (query.includes("tags")) {
    return {
      data: {
        tags: {
          edges: tags.map((t) => ({
            cursor: t.cursor,
            node: {
              id: t.id,
              name: t.name,
              articles: {
                edges: t.articleIds.map((id) => ({ cursor: id })),
                totalCount: t.articleIds.length,
              },
            },
          })),
        },
      },
    };
  }
  return { errors: [{ message: `mock-api: unknown query: ${query.slice(0, 100)}` }] };
};

const githubResponse = () => ({
  data: {
    user: {
      login: "miyamo2",
      avatarUrl: `http://localhost:${PORT}/img/avatar.png`,
      url: "https://github.com/miyamo2",
      bio: "mock bio: Backend engineer",
      socialAccounts: {
        nodes: [{ url: "https://zenn.dev/miyamo2" }, { url: "https://qiita.com/miyamo2" }],
      },
    },
  },
});

const colorOf = (name) => {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % 0xffffff;
  return { r: hash & 0xff, g: (hash >> 8) & 0xff, b: (hash >> 16) & 0xff };
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "POST" && (url.pathname === "/graphql" || url.pathname === "/github")) {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { query } = JSON.parse(body || "{}");
      const payload = url.pathname === "/github" ? githubResponse() : blogApiResponse(query ?? "");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    });
    return;
  }
  if (url.pathname.startsWith("/img/")) {
    const name = url.pathname.slice(5);
    const png = await sharp({
      create: { width: 1200, height: 630, channels: 3, background: colorOf(name) },
    })
      .png()
      .toBuffer();
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(png);
    return;
  }
  if (url.pathname === "/ogp-page") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      `<html><head><title>OGP page</title><meta property="og:title" content="Mock OGP Page" /><meta property="og:description" content="mock og description" /><meta property="og:image" content="http://localhost:${PORT}/img/ogp.png" /></head><body>mock</body></html>`
    );
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, () => {
  console.log(`mock-api listening on http://localhost:${PORT}`);
});
