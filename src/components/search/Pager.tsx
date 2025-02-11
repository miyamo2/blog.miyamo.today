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
          page={currentRefinement + 1}
          variant="ghost"
          total={nbPages}
          size="lg"
          withEdges
          onChange={(v) => {
            refine(v - 1);
          }}
        />
      </Flex>
    </>
  );
};

export default Pager;
