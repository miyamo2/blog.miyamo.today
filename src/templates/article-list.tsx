import { graphql, HeadProps, PageProps } from "gatsby";
import { Heading } from "@yamada-ui/typography";
import { Grid, Box } from "@yamada-ui/layouts";
import * as React from "react";
import { ArticleListPageContext } from "../../gatsby-node";
import { ImageDataLike } from "gatsby-plugin-image/dist/src/components/hooks";
import Pager from "../components/Pager"
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import ArticleCard from "../features/ArticleList/ArticleCard";
import { useArticleCardList } from "../hooks/useArticleCardList";

interface Tag {
  id: string;
  name: string;
}

interface ArticleCardData {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  imageData?: ImageDataLike;
  articleExcerpt?: string;
}

const ArticleList = ({
  data,
  pageContext,
}: PageProps<Queries.ArticleListQueryQuery, ArticleListPageContext>) => {
  const articleCardDataList = useArticleCardList(data.allMarkdownRemark.nodes, data.allFile.edges)

  return (
    <Layout scroll={true}>
      <div className={"w-full"}>
        <main>
          <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
            Articles
          </Heading>
          <Grid templateColumns={"repeat(auto-fill, minmax(280px, 1fr))"} gap={"sm"}>
            {articleCardDataList.map((data, i) => (
              <ArticleCard {...data} />
            ))}
          </Grid>
          <Box paddingTop={"lg"} paddingBottom={"sm"}>
            <Pager
              currentPage={pageContext.currentPage}
              pagePrefix={"pages"}
              perPage={pageContext.perPage}
              totalItems={pageContext.totalItems}
            />
          </Box>
        </main>
      </div>
    </Layout>
  );
};

export const query = graphql`
    query ArticleListQuery(
        $imageCursors: [String]
        $markdownCursors: [String]
    ) {
        allMarkdownRemark(
            filter: { frontmatter: { id: { in: $markdownCursors } } },
            sort: { frontmatter: {id: DESC}}
        ) {
            nodes {
                excerpt
                frontmatter {
                    id
                    title
                    createdAt
                    updatedAt
                    tags {
                        id
                        name
                    }
                }
            }
        }
        allFile(filter: { id: { in: $imageCursors } }) {
            edges {
                node {
                    id
                    childImageSharp {
                        gatsbyImageData(
                            width: 750
                            height: 470
                            placeholder: BLURRED
                            quality: 100
                            layout: CONSTRAINED
            )
          }
        }
      }
    }
  }
`;

export default ArticleList;

export const Head = ({ location }: HeadProps) => {
  const path = location.pathname;

  return <SEO path={path} />;
};
