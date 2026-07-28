import { Heading } from "@yamada-ui/typography";
import { Grid, Box } from "@yamada-ui/layouts";
import * as React from "react";
import Pager from "../components/Pager";
import ArticleCard from "../features/ArticleList/ArticleCard";
import type { ArticleListPageVM } from "../lib/content";

const ArticleListPage = ({ data }: { data: ArticleListPageVM }) => {
  return (
    <main>
      <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
        Articles
      </Heading>
      <Grid templateColumns={"repeat(auto-fill, minmax(280px, 1fr))"} gap={"sm"}>
        {data.cards.map((card, i) => (
          <ArticleCard {...card} />
        ))}
      </Grid>
      <Box paddingTop={"lg"} paddingBottom={"sm"}>
        <Pager
          currentPage={data.currentPage}
          pagePrefix={"pages"}
          perPage={data.perPage}
          totalItems={data.totalItems}
        />
      </Box>
    </main>
  );
};

export default ArticleListPage;
