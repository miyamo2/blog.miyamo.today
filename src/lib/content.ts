import pLimit from "p-limit";
import { writeRecords } from "@miyamo2/astro-algolia-index/records";
import { getCollection, type CollectionEntry } from "astro:content";
import type { MarkdownHeading } from "astro";
import { excerptOf, type ArticleHeading } from "./markdown";
import {
  buildCollectionImage,
  replaceRemoteImagePlaceholders,
  type RemoteImageData,
} from "./images";
import { PER_PAGE, siteMetadata } from "./site";

interface TagVM {
  id: string;
  name: string;
}

interface ArticleCardVM {
  id: string;
  title: string;
  createdAt: string;
  tags: TagVM[];
  imageData: RemoteImageData | null;
  articleExcerpt?: string;
}

interface RecommendVM {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
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

interface RssItemVM {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface Content {
  listPages: ArticleListPageVM[];
  taggedPages: TaggedArticlesPageVM[];
  tagSummaries: TagSummaryVM[];
  details: ArticleDetailVM[];
  rssItems: RssItemVM[];
}

type BlogEntry = CollectionEntry<"blogapi">;

// astro's generated `astro:content` types don't (yet) know about satteri's
// expanded `rendered.metadata` fields (headings/frontmatter) -- its own
// RenderedContent type (astro/dist/content/data-store.d.ts) already does
interface SatteriRenderedMetadata {
  headings?: MarkdownHeading[];
  frontmatter?: Record<string, unknown>;
}

const renderedMetadataOf = (entry: BlogEntry): SatteriRenderedMetadata | undefined =>
  entry.rendered?.metadata as SatteriRenderedMetadata | undefined;

interface RenderedArticle {
  /** article id from the frontmatter (= path segment of /articles/xxx) */
  id: string;
  /** content-layer store id (referenced by `recommends`) */
  entryId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tags: TagVM[];
  html: string;
  headings: ArticleHeading[];
  plainText: string;
  cardImage: RemoteImageData | null;
  detailImage: RemoteImageData | null;
  recommendImage: RemoteImageData | null;
  recommendEntryIds: string[];
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
  return {
    id: rendered.id,
    title: rendered.title,
    createdAt: rendered.createdAt,
    tags: rendered.tags,
    imageData: rendered.cardImage,
    // article-list template used excerpt with default options (pruneLength: 140, truncate: false)
    articleExcerpt: excerptOf(rendered.plainText, 140, false),
  };
};

const renderAll = async (entries: BlogEntry[]): Promise<Map<string, RenderedArticle>> => {
  const result = new Map<string, RenderedArticle>();
  // markdown itself is already rendered by astro's content-layer glob() loader
  // (satteri, see astro.config.ts); this phase resolves the remote-image
  // placeholders that rendering left behind (getImage() needs the build's
  // Vite module runner, not content-sync's -- see satteri-plugins.ts) and
  // builds the thumbnail image variants
  const limit = pLimit(6);
  await Promise.all(
    entries.map((entry) =>
      limit(async () => {
        const [html, cardImage, detailImage, recommendImage] = await Promise.all([
          replaceRemoteImagePlaceholders(entry.rendered?.html ?? ""),
          // matches the article-card thumbnail's CSS box (ArticleCard.css
          // .article-card-thumbnail height: 220px, fluid width up to ~560px
          // on the widest single-column grid cell)
          buildCollectionImage(entry.data.thumbnail, { width: 560, height: 220 }),
          buildCollectionImage(entry.data.thumbnail, { width: 1000, height: 500 }),
          buildCollectionImage(entry.data.thumbnail, { width: 840, height: 420 }),
        ]);
        const metadata = renderedMetadataOf(entry);
        const headings: ArticleHeading[] = (metadata?.headings ?? []).map((h) => ({
          depth: h.depth,
          id: h.slug,
          value: h.text,
        }));
        result.set(entry.data.id, {
          id: entry.data.id,
          entryId: entry.id,
          title: entry.data.title,
          createdAt: entry.data.createdAt.toISOString(),
          updatedAt: entry.data.updatedAt.toISOString(),
          tags: entry.data.tags,
          html,
          headings,
          plainText: String(metadata?.frontmatter?.plainText ?? ""),
          cardImage,
          detailImage,
          recommendImage,
          recommendEntryIds: entry.data.recommends.map((ref) => ref.id),
        });
      })
    )
  );
  return result;
};

const buildContent = async (): Promise<Content> => {
  // tags come from the tags.json the integration aggregates (see content.config.ts);
  // entry ids are the tag edge cursors of the GraphQL API (= path segment of /tags/xxx)
  const [entries, tagEntries] = await Promise.all([
    getCollection("blogapi"),
    getCollection("blogapiTags"),
  ]);
  const tags = tagEntries.map((tagEntry) => tagEntry.data);
  // newest first, same as the Gatsby GraphQL layer's sort: { frontmatter: { id: DESC } }
  const sorted = entries.slice().sort((a, b) => byIdDesc(a.data, b.data));
  const rendered = await renderAll(sorted);
  const renderedByEntryId = new Map(
    [...rendered.values()].map((article) => [article.entryId, article])
  );
  const totalCount = sorted.length;

  // ---- article list pages (mirrors articleListPage() in gatsby-node.ts) ----
  const listPages: ArticleListPageVM[] = range(1, Math.ceil(totalCount / PER_PAGE) || 0).map(
    (number) => {
      const chunk = sorted.slice((number - 1) * PER_PAGE, number * PER_PAGE);
      return {
        currentPage: number,
        perPage: PER_PAGE,
        totalItems: totalCount,
        cards: chunk.map((entry) => toCard(rendered.get(entry.data.id)!)),
      };
    }
  );

  // ---- tagged article pages (mirrors taggedArticlesPage() in gatsby-node.ts) ----
  const taggedPages: TaggedArticlesPageVM[] = [];
  for (const tag of tags) {
    const pages = Math.ceil(tag.articles.length / PER_PAGE) || 0;
    for (const number of range(1, pages)) {
      const ids = tag.articles.slice((number - 1) * PER_PAGE, number * PER_PAGE);
      const chunk = ids
        .map((id) => rendered.get(id))
        .filter((r): r is RenderedArticle => r !== undefined);
      taggedPages.push({
        tagId: tag.id,
        tagName: tag.name,
        currentPage: number,
        perPage: PER_PAGE,
        totalItems: tag.articles.length,
        cards: chunk
          .slice()
          .sort(byIdDesc)
          .map((r) => toCard(r)),
      });
    }
  }

  // ---- article detail pages ----
  const details: ArticleDetailVM[] = sorted.map((entry) => {
    const r = rendered.get(entry.data.id)!;
    const recommends = r.recommendEntryIds
      .map((entryId) => renderedByEntryId.get(entryId))
      .filter((rec): rec is RenderedArticle => rec !== undefined)
      .map(
        (rec): RecommendVM => ({
          id: rec.id,
          title: rec.title,
          excerpt: excerptOf(rec.plainText, 140, true),
          createdAt: rec.createdAt,
          imageData: rec.recommendImage,
        })
      );
    return {
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      tags: r.tags,
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
    cursor: tag.id,
    name: tag.name,
    totalCount: tag.articles.length,
  }));

  // ---- RSS (mirrors gatsby-plugin-feed's serialize()) ----
  const rssItems: RssItemVM[] = sorted.map((entry) => {
    const r = rendered.get(entry.data.id)!;
    return {
      id: r.id,
      title: r.title,
      description: excerptOf(r.plainText, 140, true),
      createdAt: r.createdAt,
    };
  });

  // ---- Algolia records (mirrors gatsby-plugin-algolia's transformer) ----
  // Written to @miyamo2/astro-algolia-index's sink; pushed to Algolia by that
  // integration (configured in astro.config.ts) once the build finishes.
  const algoliaRecords = sorted.map((entry) => {
    const r = rendered.get(entry.data.id)!;
    return {
      id: r.id,
      content: excerptOf(r.plainText, 3000, true),
      title: r.title,
      publishedAt: r.createdAt,
      tags: r.tags
        .filter((tag) => tag && typeof tag.name === "string" && tag.name.length > 0)
        .map((tag) => tag.name),
      hierarchy: {
        lvl0: siteMetadata.title,
        lvl1: r.title,
      },
      thumbnail: r.cardImage ? `${siteMetadata.siteUrl}${r.cardImage.src}` : "",
      type: "lvl1",
      url: `${siteMetadata.siteUrl}/articles/${r.id}`,
    };
  });
  await writeRecords(algoliaRecords);

  return {
    listPages,
    taggedPages,
    tagSummaries,
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
