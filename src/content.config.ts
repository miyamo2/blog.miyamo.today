import { defineCollection } from "astro:content";
import type { Loader } from "astro/loaders";
import {
  articlesLoader,
  articlesSchema,
  tagsLoader,
  tagsSchema,
} from "@miyamo2/astro-loader-blogapi-miyamo-today";
import { recommendLoader, recommendsField, type DataEntry } from "@miyamo2/astro-recommend-article";

const COLLECTION = "blogapi";

// same payload as the `toPayload` option previously set for
// gatsby-plugin-recommend-article in gatsby-config.ts
const toPayload = (entry: DataEntry): string => {
  const data = entry.data as {
    title?: string;
    tags?: { name?: string }[];
  };
  return JSON.stringify({
    title: data.title ?? "",
    content: entry.body ?? "",
    tags: (data.tags ?? []).map((tag) => tag?.name ?? "").filter((v) => v.length != 0),
  });
};

const articleLoader = (): Loader => {
  const inner = articlesLoader();
  const openaiApiKey = process.env.OPENAI_API_KEY ?? "";
  if (!openaiApiKey) {
    // recommendations are an enhancement; keep local builds working without credentials
    console.warn(
      "[astro-recommend-article] OPENAI_API_KEY is not set; skipping recommended articles"
    );
    return inner;
  }
  return recommendLoader({
    loader: inner,
    qdrant: {
      url: process.env.QDRANT_URL ?? "http://localhost:6333",
      onDisk: true,
    },
    openai: {
      apiKey: openaiApiKey,
      embeddingModel: "text-embedding-3-large",
      embeddingSize: 3072,
    },
    limit: 3,
    toPayload,
  });
};

export const collections = {
  [COLLECTION]: defineCollection({
    loader: articleLoader(),
    schema: (ctx) => articlesSchema(ctx).extend(recommendsField(COLLECTION)),
  }),
  blogapiTags: defineCollection({
    loader: tagsLoader(),
    schema: tagsSchema,
  }),
};
