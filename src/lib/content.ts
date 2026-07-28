import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchAllArticles, fetchAllTags, type Article, type TagWithArticles } from "./api";
import { excerptOf, renderMarkdown, type ArticleHeading } from "./markdown";
import { buildRemoteImage, remoteImagesTransform, type RemoteImageData } from "./images";
import { computeRecommendations } from "./recommend";
import { PER_PAGE, siteMetadata } from "./site";

export interface TagVM {
  id: string;
  name: string;
}

export interface ArticleCardVM {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tags: TagVM[];
  imageData: RemoteImageData | null;
  articleExcerpt?: string;
}

export interface RecommendVM {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  updatedAt: string;
  imageData: RemoteImageData | null;
}

export interface ArticleDetailVM {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tags: TagVM[];
  html: string;
  headings: ArticleHeading[];
  /** excerpt(pruneLength: 140, truncate: true); used for meta description / JSON-LD */
  excerpt: string;
  imageData: RemoteImageData | null;
  /** raw image src for og:image */
  imageSrc?: string;
  recommends: RecommendVM[];
}

export interface ArticleListPageVM {
  currentPage: number;
  perPage: number;
  totalItems: number;
  cards: ArticleCardVM[];
}

export interface TaggedArticlesPageVM extends ArticleListPageVM {
  tagId: string;
  tagName: string;
}

export interface TagSummaryVM {
  cursor: string;
  name: string;
  totalCount: number;
}

export interface RssItemVM {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface Content {
  listPages: ArticleListPageVM[];
  taggedPages: TaggedArticlesPageVM[];
  tagSummaries: TagSummaryVM[];
  tagIds: string[];
  details: ArticleDetailVM[];
  rssItems: RssItemVM[];
}

interface RenderedArticle {
  article: Article;
  html: string;
  headings: ArticleHeading[];
  plainText: string;
  cardImage: RemoteImageData | null;
  detailImage: RemoteImageData | null;
  recommendImage: RemoteImageData | null;
}

// same ordering as the Gatsby GraphQL layer's sort: { frontmatter: { id: DESC } }
const byIdDesc = (a: { id: string }, b: { id: string }): number => {
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? 1 : -1;
};

const range = (start: number, end: number) => [...Array(end - start + 1)].map((_, i) => start + i);

const toCard = (rendered: RenderedArticle): ArticleCardVM => {
  const { article } = rendered;
  return {
    id: article.id,
    title: article.title,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    tags: article.tags,
    imageData: rendered.cardImage,
    // article-list template used excerpt with default options (pruneLength: 140, truncate: false)
    articleExcerpt: excerptOf(rendered.plainText, 140, false),
  };
};

const renderAll = async (articles: Article[]): Promise<Map<string, RenderedArticle>> => {
  const result = new Map<string, RenderedArticle>();
  // article rendering fetches OGP data / images; keep some parallelism without hammering
  const CONCURRENCY = 6;
  let index = 0;
  const workers = range(1, Math.min(CONCURRENCY, articles.length)).map(async () => {
    while (index < articles.length) {
      const article = articles[index++];
      const [markdown, cardImage, detailImage, recommendImage] = await Promise.all([
        renderMarkdown(article.content, [remoteImagesTransform()]),
        buildRemoteImage(article.thumbnailUrl),
        buildRemoteImage(article.thumbnailUrl, { width: 1000, height: 500 }),
        buildRemoteImage(article.thumbnailUrl, { width: 840, height: 420 }),
      ]);
      result.set(article.id, {
        article,
        html: markdown.html,
        headings: markdown.headings,
        plainText: markdown.plainText,
        cardImage,
        detailImage,
        recommendImage,
      });
    }
  });
  await Promise.all(workers);
  return result;
};

const buildContent = async (): Promise<Content> => {
  const [{ articles, totalCount }, tags] = await Promise.all([fetchAllArticles(), fetchAllTags()]);
  const rendered = await renderAll(articles);
  const recommendations = await computeRecommendations(articles);

  // ---- article list pages (mirrors articleListPage() in gatsby-node.ts) ----
  const listPages: ArticleListPageVM[] = range(1, Math.ceil(totalCount / PER_PAGE) || 0).map(
    (number) => {
      const chunk = articles.slice((number - 1) * PER_PAGE, number * PER_PAGE);
      return {
        currentPage: number,
        perPage: PER_PAGE,
        totalItems: totalCount,
        cards: chunk
          .slice()
          .sort(byIdDesc)
          .map((article) => toCard(rendered.get(article.id)!)),
      };
    }
  );

  // ---- tagged article pages (mirrors taggedArticlesPage() in gatsby-node.ts) ----
  const taggedPages: TaggedArticlesPageVM[] = [];
  for (const tag of tags) {
    const pages = Math.ceil(tag.totalCount / PER_PAGE) || 0;
    for (const number of range(1, pages)) {
      const ids = tag.articleIds.slice((number - 1) * PER_PAGE, number * PER_PAGE);
      const chunk = ids
        .map((id) => rendered.get(id))
        .filter((r): r is RenderedArticle => r !== undefined);
      taggedPages.push({
        tagId: tag.id,
        tagName: tag.name,
        currentPage: number,
        perPage: PER_PAGE,
        totalItems: tag.totalCount,
        cards: chunk
          .slice()
          .sort((a, b) => byIdDesc(a.article, b.article))
          .map((r) => toCard(r)),
      });
    }
  }

  // ---- article detail pages ----
  const details: ArticleDetailVM[] = articles.map((article) => {
    const r = rendered.get(article.id)!;
    const recommends = (recommendations.get(article.id) ?? [])
      .map((id) => rendered.get(id))
      .filter((rec): rec is RenderedArticle => rec !== undefined)
      .map(
        (rec): RecommendVM => ({
          id: rec.article.id,
          title: rec.article.title,
          excerpt: excerptOf(rec.plainText, 140, true),
          createdAt: rec.article.createdAt,
          updatedAt: rec.article.updatedAt,
          imageData: rec.recommendImage,
        })
      );
    return {
      id: article.id,
      title: article.title,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      tags: article.tags,
      html: r.html,
      headings: r.headings,
      excerpt: excerptOf(r.plainText, 140, true),
      imageData: r.detailImage,
      imageSrc: r.detailImage?.src,
      recommends,
    };
  });

  // ---- /tags page ----
  const tagSummaries: TagSummaryVM[] = tags.map((tag) => ({
    cursor: tag.cursor,
    name: tag.name,
    totalCount: tag.totalCount,
  }));

  // ---- RSS (mirrors gatsby-plugin-feed's serialize()) ----
  const rssItems: RssItemVM[] = articles
    .slice()
    .sort(byIdDesc)
    .map((article) => {
      const r = rendered.get(article.id)!;
      return {
        id: article.id,
        title: article.title,
        description: excerptOf(r.plainText, 140, true),
        createdAt: article.createdAt,
      };
    });

  // ---- Algolia records (mirrors gatsby-plugin-algolia's transformer) ----
  // Written to a build artifact; pushed to Algolia in integrations/algolia-index.ts
  // after the build finishes.
  const algoliaRecords = articles.map((article) => {
    const r = rendered.get(article.id)!;
    return {
      id: article.id,
      content: excerptOf(r.plainText, 3000, true),
      title: article.title,
      publishedAt: article.createdAt,
      tags: article.tags
        .filter((tag) => tag && typeof tag.name === "string" && tag.name.length > 0)
        .map((tag) => tag.name),
      hierarchy: {
        lvl0: siteMetadata.title,
        lvl1: article.title,
      },
      thumbnail: article.thumbnailUrl,
      type: "lvl1",
      url: `${siteMetadata.siteUrl}/articles/${article.id}`,
    };
  });
  const artifactDir = path.join(process.cwd(), ".cache", "build-artifacts");
  await mkdir(artifactDir, { recursive: true });
  await writeFile(
    path.join(artifactDir, "algolia-records.json"),
    JSON.stringify(algoliaRecords, null, 2)
  );

  return {
    listPages,
    taggedPages,
    tagSummaries,
    tagIds: tags.map((tag) => tag.id),
    details,
    rssItems,
  };
};

let contentPromise: Promise<Content> | undefined;

export const getContent = (): Promise<Content> => {
  if (!contentPromise) {
    contentPromise = buildContent();
  }
  return contentPromise;
};
