import { graphql, PageProps, Link, HeadProps } from "gatsby";
import { Heading, Tag, List, ListItem, useMediaQuery } from "@yamada-ui/react";
import * as React from "react";
import { Layout } from "@/components/Layout";
import SEO from "@/components/SEO";

const Tags = ({ data }: PageProps<Queries.TagListQueryQuery>) => {
  const [isLarge] = useMediaQuery(["(min-width: 1280px)"]);
  return (
    <Layout scroll={true} isLarge={isLarge}>
      <main>
        <Heading className={"text-black text-3xl font-bold"} paddingBottom={"md"}>
          Tags
        </Heading>
        <List>
          {data.miyamotoday.tags.edges.map((edge, i) => (
            <ListItem key={edge.cursor}>
              <Tag as={Link} to={`/tags/${edge.cursor}`}>
                #{edge.node.name}({edge.node.articles.totalCount})
              </Tag>
            </ListItem>
          ))}
        </List>
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
