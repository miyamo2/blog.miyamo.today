import { Grid, Box } from "@yamada-ui/layouts";
import { Heading } from "@yamada-ui/typography";
import * as React from "react";
import Pager from "../components/Pager";
import ArticleCard from "../features/ArticleList/ArticleCard";
import type { TaggedArticlesPageVM } from "../lib/content";

const TaggedArticlesPage = ({ data }: { data: TaggedArticlesPageVM }) => {
  return (
    <main>
      <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
        #{data.tagName}
      </Heading>
      <Grid templateColumns={"repeat(auto-fill, minmax(280px, 1fr))"} gap={"sm"}>
        {data.cards.map((card, i) => (
          <ArticleCard {...card} />
        ))}
      </Grid>
      <Box paddingTop={"lg"} paddingBottom={"sm"}>
        <Pager
          currentPage={data.currentPage}
          basePath={`/tags/${data.tagId}`}
          perPage={data.perPage}
          totalItems={data.totalItems}
        />
      </Box>
    </main>
  );
};

export default TaggedArticlesPage;
