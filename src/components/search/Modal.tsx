import React, { useMemo } from "react";
import algoliasearch from "algoliasearch/lite";
import { Modal, ModalOverlay, ModalProps } from "@yamada-ui/modal";
import { Configure, InstantSearch } from "react-instantsearch";
import SearchBox from "./SearchBox";
import WrappedSearchResult from "./SearchResult";

interface SearchModalProps extends ModalProps {
  open: boolean;
  onClose: () => void;
}

const SearchModal = ({ open, onClose, ...rest }: SearchModalProps) => {
  const algoliaClient = useMemo(
    () => algoliasearch(process.env.GATSBY_ALGOLIA_APP_ID ?? "", process.env.GATSBY_ALGOLIA_SEARCH_KEY ?? ""),
    []
  );

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
    >
      <ModalOverlay backdropFilter="blur(10px)" />
      <InstantSearch searchClient={algoliaClient} indexName={process.env.GATSBY_ALGOLIA_INDEX_NAME ?? ""}>
        <Configure hitsPerPage={5} />
        <SearchBox />
        <WrappedSearchResult closeModal={onClose} />
      </InstantSearch>
    </Modal>
  );
};

export default SearchModal;
