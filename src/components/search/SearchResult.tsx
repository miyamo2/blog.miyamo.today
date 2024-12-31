import { Link } from "gatsby"
import { default as React } from "react"
import {
  Highlight,
  Hits,
  Index,
  Snippet,
  PoweredBy,
} from "react-instantsearch-dom"
import { useStats } from "react-instantsearch";
import { Box, Flex } from "@yamada-ui/layouts";
import "./Search.css";

const HitCount = () => {
  const { nbHits } = useStats()

  return nbHits > 0 ? (
    <Flex justifyContent={"flex-end"}>
      {nbHits} result{nbHits !== 1 ? "s" : ""}
    </Flex>
  ) : null
}

interface PageHitProps {
  hit: Hit;
}

interface Hit {
  slug: string;
}

const PageHit = ({ hit }: PageHitProps) => (
  <div>
    <Link to={hit.slug}>
      <h4>
        <Highlight attribute="title" hit={hit} />
      </h4>
    </Link>
    <Snippet attribute="excerpt" hit={hit} />
  </div>
)

interface HitsInIndexProps {
  index: Index;
}

const HitsInIndex = ({ index }: HitsInIndexProps) => (
  <Index indexName={index.name}>
    <HitCount />
    <div className="Hits">
      <Hits hitComponent={PageHit} />
    </div>
  </Index>
)

export interface Index {
  name: string;
  title: string;
}

interface SearchResultProps {
  indices: Index[];
  show: boolean;
}

const SearchResult = ({ indices, show }: SearchResultProps) => (
  <Box className={`popover`} display={show ? "block" : "none"} bg={["#ffffff", "#0d1117"]}>
    {indices.map(index => (
      <HitsInIndex index={index} key={index.name} />
    ))}
    <PoweredBy />
  </Box>
)

export default SearchResult