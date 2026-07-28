import { Flex } from "@yamada-ui/layouts";
import { Pagination } from "@yamada-ui/pagination";
import React from "react";
import { navigate } from "../lib/navigate";

interface PagerProps {
  currentPage: number;
  totalItems: number;
  perPage: number;
  /** base path of the paginated list; "" for the article list, `/tags/${tagId}` for tagged lists */
  basePath?: string;
  /** path segment inserted before the page number (e.g. "pages" -> /pages/2). omit for /tags/${tagId}/2 style */
  pagePrefix?: string;
}

const Pager = (props: PagerProps) => {
  const currentPage = props.currentPage;
  const totalPages = Math.ceil(props.totalItems / props.perPage);
  const basePath = props.basePath ?? "";
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
            if (v === 1) {
              navigate(basePath === "" ? "/" : basePath);
              return;
            }
            navigate(
              props.pagePrefix ? `${basePath}/${props.pagePrefix}/${v}` : `${basePath}/${v}`
            );
          }}
        />
      </Flex>
    </>
  );
};

export default Pager;
