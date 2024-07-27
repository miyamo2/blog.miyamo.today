import { FC } from "react";
import { Pagination } from "@yamada-ui/react";
import React from "react";
import { navigate } from "gatsby";

interface PagerProps {
  currentPage: number;
  totalItems: number;
  perPage: number;
  pagePrefix: string;
}

export const Pager: FC<PagerProps> = (props: PagerProps) => {
  const currentPage = props.currentPage;
  const totalPages = Math.ceil(props.totalItems / props.perPage);
  return (
    <>
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
    </>
  );
};
