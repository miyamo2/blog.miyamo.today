import type { AstroIntegration } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";

// port of gatsby-plugin-algolia: pushes article records (written by
// src/lib/content.ts during the page build) to the Algolia index.
export default function algoliaIndex(): AstroIntegration {
  return {
    name: "algolia-index",
    hooks: {
      "astro:build:done": async ({ logger }) => {
        const appId = process.env.PUBLIC_ALGOLIA_APP_ID;
        const apiKey = process.env.ALGOLIA_ADMIN_KEY;
        const indexName = process.env.PUBLIC_ALGOLIA_INDEX_NAME;
        if (!appId || !apiKey || !indexName) {
          logger.warn("Algolia credentials are not configured; skipping indexing");
          return;
        }

        const artifact = path.join(
          process.cwd(),
          ".cache",
          "build-artifacts",
          "algolia-records.json"
        );
        let records: ({ id: string } & Record<string, unknown>)[];
        try {
          records = JSON.parse(await readFile(artifact, "utf-8"));
        } catch (e) {
          logger.warn(`failed to read ${artifact}; skipping indexing (${String(e)})`);
          return;
        }
        const objects = records.map((record) => ({ ...record, objectID: record.id }));

        const dryRun = (() => {
          const v = process.env.ALGOLIA_DRY_RUN;
          return v !== undefined && v !== "" && v !== "false";
        })();
        if (dryRun) {
          logger.info(`[dry run] would index ${objects.length} records into ${indexName}`);
          return;
        }

        const { algoliasearch } = await import("algoliasearch");
        const client = algoliasearch(appId, apiKey);

        // mergeSettings: true equivalent -- only set the managed attributes
        await client.setSettings({
          indexName,
          indexSettings: {
            searchableAttributes: ["title", "content", "tags"],
            indexLanguages: ["ja"],
            queryLanguages: ["ja"],
            attributesToSnippet: ["content:10"],
          },
        });

        // atomic reindex through a temporary index: pushes every record and
        // drops the ones that no longer exist in a single swap
        await client.replaceAllObjects({ indexName, objects });
        logger.info(`indexed ${objects.length} records into ${indexName} (atomic replace)`);
      },
    },
  };
}
