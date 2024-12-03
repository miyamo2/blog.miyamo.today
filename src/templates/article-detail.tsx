import { graphql, HeadProps, Link, PageProps } from "gatsby";
import * as React from "react";
import { Layout } from "../components/Layout";
import { Image } from "../components/Image";
import { ArticleDetailPageContext } from "../../gatsby-node";
import {
  Heading,
  Tag,
  useMediaQuery,
  Box,
  Accordion,
  AccordionItem,
  AccordionLabel,
  AccordionPanel,
  Grid,
  GridItem,
} from "@yamada-ui/react";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faCalendarDay, faListUl } from "@fortawesome/free-solid-svg-icons";
import { format } from "@formkit/tempo";
import SEO from "../components/SEO";
import { getSrc } from "gatsby-plugin-image";

const ArticleDetail = ({
  data,
  pageContext,
}: PageProps<Queries.ArticleDetailQueryQuery, ArticleDetailPageContext>) => {
  const [isLarge] = useMediaQuery(["(min-width: 1280px)"]);

  const allFileConnection = data.allFile;

  const frontmatter = pageContext.frontmatter;
  if (!frontmatter) {
    return <></>;
  }

  const createdAt = format(new Date(frontmatter.createdAt ?? ""), "YYYY/MM/DD");

  return (
    <Layout
      scroll={true}
      isLarge={isLarge}
    >
      <main>
        <Grid
          templateAreas={ isLarge ?
            `
          "image image image toc toc"
          "title title title toc toc"
          "tag tag tag toc toc"
          "date date date toc toc"
          "content content content toc toc"
        ` : `
          "image image image"
          "title title title"
          "tag tag tag"
          "date date date"
          "content content content"
        `}>
          <GridItem gridArea={"image"}>
            <Image
              allFileConnectrion={allFileConnection}
              alt={`ArticleImage:${pageContext.cursor}`}
              objectFit={"cover"}
            />
          </GridItem>
          {
            isLarge ? <GridItem gridArea={"toc"}>{ArticleTOC(pageContext.tableOfContents ?? "", isLarge)}</GridItem> : <></>
          }
          <GridItem gridArea={"title"}>
            <Heading className={"text-black text-3xl font-bold"} paddingBottom={"md"}>
              {frontmatter.title}
            </Heading>
          </GridItem>
          <GridItem gridArea={"tag"}>
            {frontmatter.tags?.map((tag) => (
              <Tag
                as={Link}
                size={"md"}
                id={`${tag?.id}-${tag?.id}`}
                to={`/tags/${tag?.id}`}
                colorScheme={"gray"}
              >
                #{tag?.name}
              </Tag>
            ))}
          </GridItem>
          <GridItem gridArea={"date"}>
            <Box paddingTop={"md"} paddingBottom={"md"}>
              <FontAwesomeIcon icon={faCalendarDay} />
              {createdAt}
            </Box>
          </GridItem>
          <GridItem gridArea={"content"}>
            <article className={"markdown"}>
              {
                !isLarge ? ArticleTOC(pageContext.tableOfContents ?? "", isLarge) : <></>
              }
              <div
                dangerouslySetInnerHTML={{
                  __html: pageContext.html ?? "",
                }}
              ></div>
            </article>
          </GridItem>
        </Grid>
      </main>
    </Layout>
  );
};

const ArticleTOC = (toc: string, isLarge: boolean) =>  {
  return (
      <>
        {isLarge ? (
          <Box w={"full"} top={0}>
            <Heading paddingBottom={"md"}>
              <FontAwesomeIcon icon={faListUl} paddingRight={"sm"} />
              TOC
            </Heading>
            <Box borderBlock={"solid"} writingMode={"horizontal-tb"} w={"full"}>
              <div className={"side-toc"} dangerouslySetInnerHTML={{ __html: toc }}></div>
            </Box>
          </Box>
        ) : (
          <div>
            <Accordion toggle>
              <AccordionItem>
                <AccordionLabel className={"text-black text-2xl font-bold"}>
                  <FontAwesomeIcon icon={faListUl} paddingRight={"sm"} />
                  TOC
                </AccordionLabel>
                <AccordionPanel>
                  <div dangerouslySetInnerHTML={{ __html: toc }}></div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </>
    )
};

export const query = graphql`
  query ArticleDetailQuery($imageCursor: String) {
    allFile(filter: { id: { eq: $imageCursor } }) {
      nodes {
        id
        childImageSharp {
          gatsbyImageData(width: 1200, height: 630, placeholder: BLURRED, quality: 100)
        }
      }
    }
  }
`;

export default ArticleDetail;

export const Head = ({ data, pageContext, location }: HeadProps<Queries.ArticleDetailQueryQuery, ArticleDetailPageContext>) => {
  const title = pageContext.frontmatter?.title ?? undefined;
  const description = pageContext.excerpt ?? undefined;

  const childImageSharp = data.allFile?.nodes.at(0)?.childImageSharp;
  const imageSrc = childImageSharp ? getSrc(childImageSharp) : undefined;

  const path = location.pathname;

  return <SEO path={path} title={title} image={imageSrc} description={description} />;
};
