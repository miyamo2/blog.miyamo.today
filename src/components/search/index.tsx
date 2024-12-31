import React, { createRef, useState, useMemo} from "react"
import algoliasearch from "algoliasearch/lite"
import { InstantSearch} from "react-instantsearch"
import useClickOutside from "../../hooks/search/use-click-outside"
import SearchBox from "./SearchBox";
import SearchResult, { Index } from "./SearchResult";
import "./Search.css";

export default function Search({ indices }: { indices: Index[] }) {
  const rootRef = createRef()
  const [query, setQuery] = useState<string>()
  const [hasFocus, setFocus] = useState(false)
  const searchClient = useMemo(
    () =>
      algoliasearch(
        process.env.GATSBY_ALGOLIA_APP_ID ?? "",
        process.env.GATSBY_ALGOLIA_SEARCH_KEY ?? ""
      ),
    []
  )

  useClickOutside(rootRef, () => setFocus(false))

  return (
        <InstantSearch searchClient={searchClient} indexName={indices[0].name}>
          <SearchBox
            onChange={(query: string | undefined)  => setQuery(query)}
            onFocus={() => setFocus(true)}
            hasFocus={hasFocus}
          />
          <SearchResult
            show={(typeof query === "string" && query.length > 0) && hasFocus }
            indices={indices}
          />
        </InstantSearch>
  )
}