import { default as React, useCallback, useEffect, useState } from "react";
import {
  Highlight,
  PoweredBy,
  useSearchBox,
  UseSearchBoxProps,
  UseHitsProps,
  useHits,
  useStats,
  Snippet,
} from "react-instantsearch";
import { SearchBoxRenderState } from "instantsearch.js/es/connectors/search-box/connectSearchBox";
import { Hit as AlgoliaHit } from "instantsearch.js";
import { Box, Flex, Grid, GridItem } from "@yamada-ui/layouts";
import { Heading, Text } from "@yamada-ui/typography";
import { Image } from "@yamada-ui/image";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faTags } from "@fortawesome/free-solid-svg-icons";
import { navigate } from "gatsby";
import "./Search.css";
import Pager from "./Pager";

const HitCount = () => {
  const { nbHits } = useStats();

  return nbHits > 0 ? (
    <Flex justifyContent={"flex-end"}>
      {nbHits} result{nbHits !== 1 ? "s" : ""}
    </Flex>
  ) : null;
};

export interface HitDoc {
  objectID: string;
  title: string;
  content: string;
  tags: string[];
  thumbnail: string;
}

interface HitCardProps {
  hit: AlgoliaHit<HitDoc>;
  onLinkClick: () => void;
}

const HitCard = ({ hit, onLinkClick }: HitCardProps) => {
  return (
    <GridItem>
      <Grid
        boxShadow={"md"}
        onClick={() => {
          navigate(`/articles/${hit.objectID}`);
          onLinkClick();
        }}
        aria-label={`link: ${hit.title}`}
        bg={["#f6f8fa", "#151b23"]}
        w={"full"}
        className={"w-full h-full index-hit-card transform-scaleup-then-hover"}
        overflow={"hidden"}
      >
        <GridItem
          overflow={"hidden"}
          className={"transform-scaleup-then-hover-img-wrapper"}
          gridArea={"image"}
        >
          <Image src={hit.thumbnail} objectFit="cover" className={"h-full w-full"} />
        </GridItem>
        <GridItem overflow={"hidden"} gridArea={"title"}>
          <Heading as="h2" size={"md"}>
            <Highlight hit={hit} attribute={"title"} />
          </Heading>
        </GridItem>
        <GridItem gridArea={"content"} alignSelf={"start"}>
          <Snippet hit={hit} attribute={"content"} />
        </GridItem>
        <GridItem gridArea={"tag"} alignSelf={"end"}>
          <Text>
            <FontAwesomeIcon icon={faTags} paddingRight={"sm"} />
            <Highlight hit={hit} attribute={`tags`} />
          </Text>
        </GridItem>
      </Grid>
    </GridItem>
  );
};

interface PageHitProps extends UseHitsProps<HitDoc> {
  onLinkClick: () => void;
}

const PageHit = (props: PageHitProps) => {
  const { items } = useHits(props);

  return (
    <Grid templateRows={`repeat(${items.length}, 1fr)`} gap={"sm"}>
      {items.map((hit) => (
        <HitCard hit={hit} onLinkClick={props.onLinkClick} />
      ))}
    </Grid>
  );
};

interface SearchResultProps extends SearchBoxRenderState {
  closeModal: () => void;
}

const SearchResult = ({ refine, clear, closeModal }: SearchResultProps) => {
  const { nbHits, nbPages } = useStats();

  const onCardClick = useCallback(() => {
    clear();
    closeModal();
  }, [refine]);

  return (
    <Box
      className={`popover w-full ${nbHits === 0 && nbPages === 0 ? "hidden" : ""}`}
      bg={["#ffffff", "#0d1117"]}
    >
      <HitCount />
      <div className="Hits">
        <PageHit onLinkClick={onCardClick} />
      </div>
      <Pager />
      <PoweredBy />
    </Box>
  );
};

interface WrappedSearchResultProps extends UseSearchBoxProps {
  closeModal: () => void;
}

const WrappedSearchResult = (props: WrappedSearchResultProps) => {
  const { query, refine, clear, isSearchStalled } = useSearchBox(props);
  return (
    <SearchResult
      closeModal={props.closeModal}
      query={query}
      refine={refine}
      clear={clear}
      isSearchStalled={isSearchStalled}
    />
  );
};

export default WrappedSearchResult;
