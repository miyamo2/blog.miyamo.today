import { usePagination, UsePaginationProps } from 'react-instantsearch';
import { Flex } from "@yamada-ui/layouts";
import { Pagination } from "@yamada-ui/pagination";
import React from "react";

interface PagerProps extends UsePaginationProps {}

const Pager = (props: PagerProps) => {
  const {
    currentRefinement,
    nbPages,
    refine,
  } = usePagination(props);

  return (
    <>
      <Flex justifyContent={"center"} alignItems={"center"}>
        <Pagination
          page={currentRefinement}
          variant="ghost"
          total={nbPages}
          size="lg"
          withEdges
          onChange={(v) => {
            refine(v-1);
          }}
          controlNextProps={{disabled: nbPages === currentRefinement+1}}
          controlPrevProps={{disabled: currentRefinement === 0}}
          edgeFirstProps={{disabled: currentRefinement === 0}}
          edgeLastProps={{disabled: nbPages === currentRefinement+1}}
        />
      </Flex>
    </>
  );
};

export default Pager;