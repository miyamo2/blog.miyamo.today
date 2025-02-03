import { graphql, PageProps, Link, HeadProps } from "gatsby";
import { Grid } from "@yamada-ui/layouts";
import { Tag } from "@yamada-ui/tag";
import { Heading } from "@yamada-ui/typography";
import * as React from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { useJSONLD, useWebSiteJSONLD } from "../hooks/useJSONLD";

const Tags = ({ data }: PageProps<Queries.TagListQueryQuery>) => {
  return (
    <Layout>
      <main>
        <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
          Tags
        </Heading>
        <Grid templateColumns={"repeat(auto-fill, minmax(10rem, 1fr))"} gap={"sm"}>
          {data.miyamotoday.tags.edges.map((edge, i) => (
            <Tag as={Link} to={`/tags/${edge.cursor}`} bg={["#ddf4ff", "#121d2f"]}>
              #{edge.node.name}({edge.node.articles.totalCount})
            </Tag>
          ))}
        </Grid>
      </main>
    </Layout>
  );
};

export const query = graphql`
  query TagListQuery {
    miyamotoday {
      tags {
        edges {
          cursor
          node {
            name
            articles {
              totalCount
            }
          }
        }
      }
    }
  }
`;

export default Tags;

export const Head = ({ location, data }: HeadProps<Queries.TagListQueryQuery>) => {
  const path = location.pathname;
  const jsonLDTags = data.miyamotoday.tags.edges.map((edge, i) => {
    return useJSONLD({
      type: "ListItem",
      path: `tags/${edge.cursor}/`,
      withUrl: true,
      attributes: {
        position: i + 1,
      },
    });
  });

  const jsonLDWebSite = useWebSiteJSONLD();
  const jsonLDTagsPage = useJSONLD({
    type: "ItemList",
    headline: "Tags",
    path: path,
    description: "タグ一覧",
    withUrl: true,
    withAuthor: true,
    withLogo: true,
    withContext: true,
    withID: true,
    attributes: {
      itemListElement: jsonLDTags,
    },
  });
  return <SEO path={path} title={"Tags"} jsonLD={[jsonLDWebSite, jsonLDTagsPage]} />;
};
