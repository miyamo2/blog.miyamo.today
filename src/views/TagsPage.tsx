import { Grid } from "@yamada-ui/layouts";
import { Tag } from "@yamada-ui/tag";
import { Heading } from "@yamada-ui/typography";
import type { TagSummaryVM } from "../lib/content";

const TagsPage = ({ data }: { data: TagSummaryVM[] }) => {
  return (
    <main>
      <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
        Tags
      </Heading>
      <Grid templateColumns={"repeat(auto-fill, minmax(10rem, 1fr))"} gap={"sm"}>
        {data.map((tag) => (
          <Tag as="a" key={tag.cursor} href={`/tags/${tag.cursor}`} bg={["#ddf4ff", "#121d2f"]}>
            #{tag.name}({tag.totalCount})
          </Tag>
        ))}
      </Grid>
    </main>
  );
};

export default TagsPage;
