import { usePagination } from "react-instantsearch";
import { Flex } from "@yamada-ui/layouts";
import { Pagination } from "@yamada-ui/pagination";

const Pager = () => {
  const { currentRefinement, nbPages, refine } = usePagination();

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
