import type { SearchClient } from "instantsearch.js";
import algoliasearch from "algoliasearch/lite";
import { MultipleQueriesQuery, MultipleQueriesResponse } from "@algolia/client-search";

export const UseSearchClient  = (): SearchClient => {
  const algoliaClient = algoliasearch(process.env.GATSBY_ALGOLIA_APP_ID ?? "", process.env.GATSBY_ALGOLIA_SEARCH_KEY ?? "")
  return  {
    ...algoliaClient,
    search: <SearchResponse,>(requests: Readonly<MultipleQueriesQuery[]>) => {
      if (requests.every(({ params }) => !params?.query)) {
        return Promise.resolve<MultipleQueriesResponse<SearchResponse>>({
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
      return algoliaClient.search(requests);
    },
  };
}