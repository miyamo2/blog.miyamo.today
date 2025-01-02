import { default as React, useCallback, useEffect, useState } from "react";
import {
  Highlight,
  PoweredBy,
  useSearchBox,
  UseSearchBoxProps,
  UseHitsProps,
  useHits,
  Snippet,
} from "react-instantsearch";
import { SearchBoxRenderState } from "instantsearch.js/es/connectors/search-box/connectSearchBox";
import { useStats } from "react-instantsearch";
import { Hit as AlgoliaHit } from "instantsearch.js";
import { Box, Flex, VStack } from "@yamada-ui/layouts";
import { Card, CardBody, CardFooter, CardHeader } from "@yamada-ui/card";
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
    <Card
      onClick={() => {
        navigate(`/articles/${hit.objectID}`);
        onLinkClick();
      }}
      variant="outline"
      className={"transform-scaleup-then-hover flex-col lg:flex-row"}
      overflow={"hidden"}
    >
      <Image src={hit.thumbnail} objectFit="cover" className={"h-[20%] lg:w-[30%] lg:h-auto"} />
      <VStack gap="0">
        <CardHeader>
          <Heading size="md">
            <Highlight hit={hit} attribute={"title"} />
          </Heading>
        </CardHeader>

        <CardBody overflow="hidden">
          <Snippet hit={hit} attribute={"content"} />
        </CardBody>

        <CardFooter>
          <Text>
            <FontAwesomeIcon icon={faTags} paddingRight={"sm"} />
            <Highlight hit={hit} attribute={`tags`} />
          </Text>
        </CardFooter>
      </VStack>
    </Card>
  );
};

interface PageHitProps extends UseHitsProps<HitDoc> {
  onLinkClick: () => void;
}

const PageHit = (props: PageHitProps) => {
  const { items } = useHits(props);

  return (
    <Flex direction={"column"} alignItems={"stretch"} className={"w-full"}>
      {items.map((hit) => (
          <HitCard hit={hit} onLinkClick={props.onLinkClick} />
      ))}
    </Flex>
  );
};

interface SearchResultProps extends SearchBoxRenderState {
  closeModal: () => void;
}

const SearchResult = ({ refine, query, clear, closeModal }: SearchResultProps) => {
  const [isShow, setShow] = useState<boolean>(true);

  useEffect(() => {
    setShow(!!query);
  }, [query]);

  const handleResetSearchWords = useCallback(() => {
    clear();
    closeModal();
  }, [refine]);

  return (
    <>
      {isShow ? (
        <Box className={`popover w-full`} bg={["#ffffff", "#0d1117"]}>
          <HitCount />
          <div className="Hits">
            <PageHit onLinkClick={handleResetSearchWords} />
          </div>
          <Pager />
          <PoweredBy />
        </Box>
      ) : (
        <></>
      )}
    </>
  );
};

interface WrappedSearchResultProps extends UseSearchBoxProps {
  closeModal: () => void;
}

const WrappedSearchResult = (props: WrappedSearchResultProps) => {
  const {
    query,
    refine,
    clear,
    isSearchStalled,
  } = useSearchBox(props);
  return <SearchResult closeModal={props.closeModal} query={query} refine={refine} clear={clear} isSearchStalled={isSearchStalled} />;
};

export default WrappedSearchResult;
