import { usePagination, UsePaginationProps, useStats } from "react-instantsearch";
import { Flex } from "@yamada-ui/layouts";
import { Pagination } from "@yamada-ui/pagination";
import React from "react";

interface PagerProps extends UsePaginationProps {}

const Pager = (props: PagerProps) => {
  const { currentRefinement, nbPages, refine } = usePagination(props);
  const { nbHits } = useStats();

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
            refine(v - 1);
          }}
          controlNextProps={{ hidden: nbPages === currentRefinement + 1 || nbHits === 0 }}
          controlPrevProps={{ hidden: currentRefinement === 0 }}
          edgeFirstProps={{ hidden: currentRefinement === 0 }}
          edgeLastProps={{ hidden: nbPages === currentRefinement + 1 || nbHits === 0 }}
        />
      </Flex>
    </>
  );
};

export default Pager;
