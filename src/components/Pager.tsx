import { Flex } from "@yamada-ui/layouts";
import { Pagination } from "@yamada-ui/pagination";
import React from "react";
import { navigate } from "gatsby";

interface PagerProps {
  currentPage: number;
  totalItems: number;
  perPage: number;
  pagePrefix: string;
}

const Pager = (props: PagerProps) => {
  const currentPage = props.currentPage;
  const totalPages = Math.ceil(props.totalItems / props.perPage);
  return (
    <>
      <Flex justifyContent={"center"} alignItems={"center"}>
        <Pagination
          page={currentPage}
          variant="ghost"
          total={totalPages}
          size="lg"
          withEdges
          onChange={(v) => {
            navigate(`${props.pagePrefix}/${v}`);
          }}
        />
      </Flex>
    </>
  );
};

export default Pager;
