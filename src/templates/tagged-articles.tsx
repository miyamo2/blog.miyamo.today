import { graphql, HeadProps, PageProps } from "gatsby";
import { Grid, Box, Heading, useMediaQuery } from "@yamada-ui/react";
import { ArticleCard } from "@/features/ArticleList/ArticleCard";
import * as React from "react";
import { Pager } from "@/components/Pager";
import { Layout } from "@/components/Layout";
import { TaggedArticlesPageContext } from "../../gatsby-node";
import { ImageDataLike } from "gatsby-plugin-image/dist/src/components/hooks";
import SEO from "@/components/SEO";

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

const TaggedArticleList = ({
  data,
  pageContext,
}: PageProps<Queries.TaggedArticleListQueryQuery, TaggedArticlesPageContext>) => {
  const [isLarge] = useMediaQuery(["(min-width: 1280px)"]);

  const articleCardDataList: ArticleCardData[] = (() => {
    return data.allMarkdownRemark.nodes
      .map((node): ArticleCardData | undefined => {
        const frontmatter = node.frontmatter;
        if (!frontmatter) {
          return undefined;
        }

        const imageDataEdge = data.allFile.edges.find(
          (edge: { node: { id: string } }) => edge.node.id === `ArticleImage:${frontmatter.id}`
        );
        const imageData = imageDataEdge?.node.childImageSharp || undefined;
        const articleExcerpt = node.excerpt ?? undefined;

        const { id, title, createdAt, updatedAt, tags } = frontmatter;
        if (!id || !title || !createdAt || !updatedAt) {
          return undefined;
        }

        const articleCardData: ArticleCardData = {
          id: id,
          title: title,
          createdAt: createdAt,
          updatedAt: updatedAt,
          tags:
            tags
              ?.filter((tag) => tag !== undefined && tag !== null)
              .map((tag) => {
                return { id: tag.id ?? "", name: tag.name ?? "" };
              }) ?? Array.of<Tag>(),
          imageData: imageData,
          articleExcerpt: articleExcerpt,
        };
        return articleCardData;
      })
      .filter((data: ArticleCardData | undefined) => data !== undefined);
  })();

  return (
    <Layout scroll={true} isLarge={isLarge}>
      <main>
        <Heading className={"text-black text-3xl font-bold"} paddingBottom={"md"}>
          #{pageContext.tagName}
        </Heading>
        <Grid templateColumns={"repeat(auto-fill, minmax(280px, 1fr))"}>
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
    </Layout>
  );
};

export const query = graphql`
  query TaggedArticleListQuery($imageCursors: [String], $markdownCursors: [String]) {
    allMarkdownRemark(filter: { frontmatter: { id: { in: $markdownCursors } } }) {
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
              width: 600
              height: 600
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

export default TaggedArticleList;

export const Head = ({
  location,
  pageContext,
}: HeadProps<Queries.TaggedArticleListQueryQuery, TaggedArticlesPageContext>) => {
  const title = `#${pageContext.tagName}`;
  const path = location.pathname;

  return <SEO path={path} title={title} />;
};
