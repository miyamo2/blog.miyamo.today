import { graphql, PageProps, Link, HeadProps } from "gatsby";
import { Heading, Tag, Grid } from "@yamada-ui/react";
import * as React from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";

const Tags = ({ data }: PageProps<Queries.TagListQueryQuery>) => {
  return (
    <Layout scroll={true}>
      <main>
        <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
          Tags
        </Heading>
        <Grid templateColumns={"repeat(auto-fill, minmax(120px, auto))"} gap={"sm"}>
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

export const Head = ({ location }: HeadProps) => {
  const path = location.pathname;
  return <SEO path={path} title={"Tags"} />;
};
