import type { SearchClient } from "instantsearch.js";
import { liteClient as algoliasearch } from "algoliasearch/lite";
import type { LegacySearchMethodProps, SearchResponses } from "algoliasearch/lite";
import { PUBLIC_ALGOLIA_APP_ID, PUBLIC_ALGOLIA_SEARCH_KEY } from "astro:env/client";

export const UseSearchClient = (): SearchClient => {
  const algoliaClient = algoliasearch(PUBLIC_ALGOLIA_APP_ID, PUBLIC_ALGOLIA_SEARCH_KEY);
  return {
    ...algoliaClient,
    search: <SearchResponse,>(requests: LegacySearchMethodProps) => {
      if (requests.every(({ params }) => !params?.query)) {
        return Promise.resolve<SearchResponses<SearchResponse>>({
          results: requests.map(() => ({
            hits: [],
            nbHits: 0,
            nbPages: 0,
            page: 0,
            processingTimeMS: 0,
            hitsPerPage: 0,
            exhaustiveNbHits: true,
            query: "",
            params: "",
          })),
        });
      }
      return algoliaClient.search<SearchResponse>(requests);
    },
  };
};
