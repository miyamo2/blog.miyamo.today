import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Article } from "./api";

// Replaces gatsby-plugin-recommend-article (OpenAI embeddings + qdrant).
// The vector search is now a simple in-memory cosine similarity, which removes
// the qdrant service from the build. Embeddings are cached on disk (.cache) so
// unchanged articles are not re-embedded on every build.

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_SIZE = 3072;
const LIMIT = 3;
// text-embedding-3-large accepts up to 8191 tokens; keep a safe margin for Japanese text
const MAX_PAYLOAD_CHARS = 6000;

const CACHE_FILE = path.join(process.cwd(), ".cache", "openai-embeddings.json");

interface CachedEmbedding {
  hash: string;
  vector: number[];
}

type EmbeddingCache = Record<string, CachedEmbedding>;

// same payload as the `toPayload` option in gatsby-config.ts
const toPayload = (article: Article): string => {
  return JSON.stringify({
    title: article.title,
    content: article.content,
    tags: article.tags.map((tag) => tag.name).filter((v) => v.length != 0),
  });
};

const loadCache = async (): Promise<EmbeddingCache> => {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf-8")) as EmbeddingCache;
  } catch {
    return {};
  }
};

const saveCache = async (cache: EmbeddingCache) => {
  await mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache));
};

const fetchEmbeddings = async (apiKey: string, inputs: string[]): Promise<number[][]> => {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_SIZE,
      input: inputs,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings request failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  const vectors: number[][] = new Array(inputs.length);
  for (const item of body.data) {
    vectors[item.index] = item.embedding;
  }
  return vectors;
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Computes recommended article ids (top 3 by cosine similarity) for each article.
 * Returns an empty map when OPENAI_API_KEY is not configured.
 */
export const computeRecommendations = async (
  articles: Article[]
): Promise<Map<string, string[]>> => {
  const result = new Map<string, string[]>();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[recommend] OPENAI_API_KEY is not set; skipping recommended articles");
    return result;
  }

  const cache = await loadCache();
  const payloads = new Map<string, { payload: string; hash: string }>();
  for (const article of articles) {
    const payload = toPayload(article).slice(0, MAX_PAYLOAD_CHARS);
    payloads.set(article.id, {
      payload,
      hash: createHash("sha256").update(payload).digest("hex"),
    });
  }

  const toEmbed = articles.filter((article) => {
    const { hash } = payloads.get(article.id)!;
    return cache[article.id]?.hash !== hash;
  });

  const BATCH_SIZE = 20;
  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    const vectors = await fetchEmbeddings(
      apiKey,
      batch.map((article) => payloads.get(article.id)!.payload)
    );
    batch.forEach((article, index) => {
      cache[article.id] = {
        hash: payloads.get(article.id)!.hash,
        vector: vectors[index],
      };
    });
  }
  if (toEmbed.length > 0) {
    await saveCache(cache);
  }

  for (const article of articles) {
    const own = cache[article.id];
    if (!own) {
      continue;
    }
    const scored = articles
      .filter((other) => other.id !== article.id && cache[other.id])
      .map((other) => ({
        id: other.id,
        score: cosineSimilarity(own.vector, cache[other.id]!.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMIT);
    result.set(
      article.id,
      scored.map((s) => s.id)
    );
  }
  return result;
};
