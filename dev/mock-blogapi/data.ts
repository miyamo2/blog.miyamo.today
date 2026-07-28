export interface MockTag {
  id: string;
  name: string;
}

export interface MockArticle {
  id: string;
  title: string;
  content: string;
  thumbnailUrl: string;
  createdAt: string;
  updatedAt: string;
  tagIds: string[];
}

export interface MockDataSet {
  /** newest first; edge cursors are article ids */
  articles: MockArticle[];
  tags: MockTag[];
}

const TAGS: MockTag[] = [
  { id: "go", name: "Go" },
  { id: "typescript", name: "TypeScript" },
  { id: "gatsby", name: "Gatsby" },
  { id: "graphql", name: "GraphQL" },
  { id: "aws", name: "AWS" },
  { id: "terraform", name: "Terraform" },
  { id: "diary", name: "日記" },
];

const ARTICLE_COUNT = 30;

// deterministic PRNG so every restart serves identical data
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// ULID-shaped id: lexicographic order matches chronological order,
// like the ids served by the real blogapi
const ulidLike = (epochMillis: number, random: () => number): string => {
  let time = "";
  let rest = epochMillis;
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[rest % 32] + time;
    rest = Math.floor(rest / 32);
  }
  let entropy = "";
  for (let i = 0; i < 16; i++) {
    entropy += CROCKFORD[Math.floor(random() * 32)];
  }
  return time + entropy;
};

// "2026-07-20T12:34:56+09:00" — matches how templates parse frontmatter dates
const formatJst = (epochMillis: number): string => {
  const jst = new Date(epochMillis + 9 * 60 * 60 * 1000);
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return (
    `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}` +
    `T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}+09:00`
  );
};

const CODE_SAMPLES: Record<string, { language: string; code: string }> = {
  go: {
    language: "go",
    code: `package main

import "fmt"

func main() {
	articles := []string{"mock", "blogapi", "miyamo.today"}
	for i, a := range articles {
		fmt.Printf("%d: %s\\n", i, a)
	}
}`,
  },
  typescript: {
    language: "typescript",
    code: `type Article = { id: string; title: string };

const articles: Article[] = await fetchArticles();
console.log(articles.map((a) => a.title));`,
  },
  gatsby: {
    language: "typescript",
    code: `export const query = graphql\`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
\`;`,
  },
  graphql: {
    language: "graphql",
    code: `query GetArticles($first: Int) {
  articles(first: $first) {
    edges {
      node {
        id
        title
      }
    }
  }
}`,
  },
  aws: {
    language: "bash",
    code: `aws s3 sync ./public "s3://\${BUCKET_NAME}" --delete`,
  },
  terraform: {
    language: "hcl",
    code: `resource "aws_s3_bucket" "blog" {
  bucket = "blog.miyamo.today"
}`,
  },
  diary: {
    language: "text",
    code: "今日もいい一日だった。",
  },
};

const articleContent = (
  index: number,
  title: string,
  tags: MockTag[],
  imageUrl: string
): string => {
  const primaryTag = tags[0];
  const sample = CODE_SAMPLES[primaryTag.id] ?? CODE_SAMPLES.diary;
  return `これは開発用モックの記事です(第${index + 1}回)。${tags
    .map((t) => t.name)
    .join("と")}についてゆるく書いていきます。

## はじめに

**${title}** のサンプル本文です。モックサーバー(\`dev/mock-blogapi\`)が生成しています。
インラインコードは \`bun run mock:blogapi\` のように表示されます。

![sample image](${imageUrl})

## ${primaryTag.name}の話

コードブロックのハイライト確認用サンプルです。

\`\`\`${sample.language}
${sample.code}
\`\`\`

### 箇条書き

- ひとつめのポイント
- ふたつめのポイント
  - ネストした補足
- [リンクの表示確認](https://blog.miyamo.today)

### テーブル

| 項目 | 値 |
| ---- | -- |
| index | ${index + 1} |
| tags | ${tags.map((t) => t.name).join(", ")} |

## おわりに

> 引用の表示確認です。

以上、モック記事でした。
`;
};

export const buildMockDataSet = (imageBaseUrl: string): MockDataSet => {
  const random = mulberry32(20260728);
  // one article roughly every 5 days, newest around 2026-07-20 (JST)
  const newestEpochMillis = Date.UTC(2026, 6, 20, 3, 30, 0);
  const dayMillis = 24 * 60 * 60 * 1000;

  const articles: MockArticle[] = [];
  for (let i = 0; i < ARTICLE_COUNT; i++) {
    const createdAt =
      newestEpochMillis - i * 5 * dayMillis - Math.floor(random() * 10) * 60 * 60 * 1000;
    const updatedAt = createdAt + Math.floor(random() * 3) * dayMillis;
    const id = ulidLike(createdAt, random);
    const tags = [
      TAGS[i % TAGS.length],
      ...(i % 3 === 0 ? [TAGS[(i + 3) % TAGS.length]] : []),
    ];
    const title = `モック記事 #${ARTICLE_COUNT - i}: ${tags[0].name}について`;
    articles.push({
      id,
      title,
      content: articleContent(
        ARTICLE_COUNT - i - 1,
        title,
        tags,
        `${imageBaseUrl}/images/content-${id}.png`
      ),
      thumbnailUrl: `${imageBaseUrl}/images/thumbnail-${id}.png`,
      createdAt: formatJst(createdAt),
      updatedAt: formatJst(updatedAt),
      tagIds: tags.map((t) => t.id),
    });
  }
  // newest first; ids are time-ordered so this also sorts by id desc
  articles.sort((a, b) => (a.id < b.id ? 1 : -1));
  return { articles, tags: TAGS };
};
