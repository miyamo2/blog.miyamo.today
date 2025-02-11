import { graphql, HeadProps, PageProps } from "gatsby";
import { Grid, Box } from "@yamada-ui/layouts";
import { Heading } from "@yamada-ui/typography";
import * as React from "react";
import { TaggedArticlesPageContext } from "../../gatsby-node";
import { ImageDataLike } from "gatsby-plugin-image/dist/src/components/hooks";
import Pager from "../components/Pager";
import SEO from "../components/SEO";
import ArticleCard from "../features/ArticleList/ArticleCard";
import { useArticleCardList } from "../hooks/useArticleCardList";
import { useJSONLD, useWebSiteJSONLD } from "../hooks/useJSONLD";
import { ScrollDrivenAnimationStyle } from "../components/ScrollDrivenAnimation";

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
  const articleCardDataList = useArticleCardList(data.allMarkdownRemark.nodes);

  return (
    <main>
      <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
        #{pageContext.tagName}
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
  );
};

export const query = graphql`
  query TaggedArticleListQuery($markdownCursors: [String]) {
    allMarkdownRemark(
      filter: { frontmatter: { id: { in: $markdownCursors } } }
      sort: { frontmatter: { id: DESC } }
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
        thumbnail {
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

export default TaggedArticleList;

export const Head = ({
  location,
  data,
  pageContext,
}: HeadProps<Queries.TaggedArticleListQueryQuery, TaggedArticlesPageContext>) => {
  const title = `#${pageContext.tagName}`;
  const path = location.pathname;
  const page = path.split("/").at(-1);

  const jsonLDWebSite = useWebSiteJSONLD();
  const jsonLDArticles = data.allMarkdownRemark.nodes.map((node, i) => {
    return useJSONLD({
      type: "ListItem",
      path: `articles/${node.frontmatter?.id}`,
      withUrl: true,
      attributes: {
        position: i + 1,
      },
    });
  });
  const jsonLDTaggedArticlesPage = useJSONLD({
    type: "ItemList",
    headline: "Articles",
    path: path,
    description: page
      ? `#${pageContext.tagName}の記事一覧(page ${page})`
      : `#${pageContext.tagName}の記事一覧`,
    withUrl: true,
    withAuthor: true,
    withLogo: true,
    withContext: true,
    withID: true,
    attributes: {
      itemListElement: jsonLDArticles,
    },
  });

  return (
    <>
      <SEO path={path} title={title} jsonLD={[jsonLDWebSite, jsonLDTaggedArticlesPage]} />
      <ScrollDrivenAnimationStyle />
    </>
  );
};
