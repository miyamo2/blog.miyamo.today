import React, { useMemo } from "react";
import { Modal, ModalOverlay, ModalProps } from "@yamada-ui/modal";
import { Configure, InstantSearch } from "react-instantsearch";
import type { SearchClient } from "instantsearch.js";
import SearchBox from "./SearchBox";
import WrappedSearchResult from "./SearchResult";
import { UseSearchClient } from "../../hooks/search/useSearchClient";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { IconButton } from "@yamada-ui/button";
import { HStack } from "@yamada-ui/layouts";

interface SearchModalProps extends ModalProps {
  open: boolean;
  onClose: () => void;
}

const SearchModal = ({ open, onClose, ...rest }: SearchModalProps) => {
  const searchClient: SearchClient = useMemo(UseSearchClient, []);

  return (
    <Modal
      size="3xl"
      open={open}
      placement="top"
      onClose={onClose}
      withCloseButton={false}
      {...rest}
      className={"h-fit"}
      lockFocusAcrossFrames={true}
      bg={"transparent"}
      animation={"bottom"}
      duration={0.3}
    >
      <ModalOverlay backdropFilter="blur(10px)" />
      <InstantSearch searchClient={searchClient} indexName={process.env.GATSBY_ALGOLIA_INDEX_NAME ?? ""}>
        <Configure hitsPerPage={5} />
        <HStack>
          <SearchBox closeModal={onClose} />
          <IconButton
            icon={<FontAwesomeIcon icon={faXmark} />}
            size="sm"
            onClick={onClose}
          />
        </HStack>
        <WrappedSearchResult closeModal={onClose} />
      </InstantSearch>
    </Modal>
  );
};

export default SearchModal;
