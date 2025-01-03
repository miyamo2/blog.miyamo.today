import { graphql, HeadProps, Link, PageProps } from "gatsby";
import * as React from "react";
import { ArticleDetailPageContext } from "../../gatsby-node";
import { Box, Flex, Grid, GridItem, Separator } from "@yamada-ui/layouts";
import { Heading } from "@yamada-ui/typography";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { Tag } from "@yamada-ui/tag";
import { useColorMode } from "@yamada-ui/core";
import Giscus from "@giscus/react";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";
import { format } from "@formkit/tempo";
import { getSrc } from "gatsby-plugin-image";
import Layout from "../components/Layout";
import Image from "../components/Image";
import SEO from "../components/SEO";
import "./article-detail.css";
import { ArticleTOCLarge, ArticleTOCMedium } from "../features/ArticleDetail/TOC";
import ShareButtons from "../components/ShareButtons";

const ArticleDetail = ({
  location,
  data,
  pageContext,
}: PageProps<Queries.ArticleDetailQueryQuery, ArticleDetailPageContext>) => {
  const { colorMode } = useColorMode();
  const { allFile, allMarkdownRemark } = data;

  const markdownRemark = allMarkdownRemark.nodes.at(0);
  const { frontmatter, headings } = markdownRemark ?? {
    frontmatter: undefined,
    headings: undefined,
  };

  if (!frontmatter) {
    return <></>;
  }

  const createdAt = format(new Date(frontmatter.createdAt ?? ""), "YYYY/MM/DD");

  return (
    <Layout scroll={true}>
      <main>
        <Grid className={"article-detail"}>
          <GridItem gridArea={"title"}>
            <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
              {frontmatter.title}
            </Heading>
          </GridItem>
          <GridItem gridArea={"tag"}>
            <Box>
              {frontmatter.tags
                ?.filter((v) => v)
                .map((tag) => (
                  <Tag
                    as={Link}
                    size={"md"}
                    id={`${tag?.id}-${tag?.id}`}
                    to={`/tags/${tag?.id}`}
                    bg={["#ddf4ff", "#121d2f"]}
                  >
                    #{tag?.name}
                  </Tag>
                ))}
            </Box>
          </GridItem>
          <GridItem gridArea={"date"}>
            <Box paddingTop={"md"} paddingBottom={"md"}>
              <FontAwesomeIcon icon={faCalendarDay} paddingRight={"sm"} />
              {createdAt}
            </Box>
          </GridItem>
          <GridItem gridArea={"image"}>
            <Image
              allFileConnectrion={allFile}
              alt={`ArticleImage:${pageContext.cursor}`}
              objectFit={"cover"}
            />
          </GridItem>
          <GridItem
            gridArea={"lnav"}
            alignSelf={"end"}
            h={"full"}
            w={"full"}
            className={"contain-paint hidden lg:block"}
          >
            <Box h={"full"} overflow={"visible"}>
              <Box position={"sticky"} top={0}>
                <ShareButtons
                  title={frontmatter.title ?? ""}
                  url={`https://${location.host}${location.pathname}`}
                  stackType={"v"}
                  buttonSize={32}
                />
              </Box>
            </Box>
          </GridItem>
          <GridItem
            gridArea={"rnav"}
            alignSelf={"start"}
            h={"full"}
            w={"full"}
            className={"contain-paint hidden lg:block"}
          >
            <Box h={"full"} overflow={"visible"}>
              <Box position={"sticky"} top={0}>
                <ArticleTOCLarge headings={headings}></ArticleTOCLarge>
              </Box>
            </Box>
          </GridItem>
          <GridItem gridArea={"toc"} position={"sticky"} top={0} className={"lg:hidden"} zIndex={2}>
            <ArticleTOCMedium headings={headings}></ArticleTOCMedium>
          </GridItem>
          <GridItem gridArea={"content"} className={"scroll-offset w-full"}>
            <article>
              <div
                dangerouslySetInnerHTML={{
                  __html: markdownRemark?.html ?? "",
                }}
                className={"markdown-body w-full"}
              ></div>
            </article>
          </GridItem>
          <GridItem gridArea={"share"} className={"lg:hidden"} paddingTop={"md"}>
            <Flex justifyContent={"space-evenly"}>
              <ShareButtons
                title={frontmatter.title ?? ""}
                url={`https://${location.host}${location.pathname}`}
                stackType={"h"}
                buttonSize={32}
              />
            </Flex>
          </GridItem>
          <GridItem gridArea={"comment"} justifySelf={"stretch"}>
            <Separator paddingY={"sm"} />
            <Giscus
              id={"comments"}
              repo={"miyamo2/comments.miyamo.today"}
              repoId={"R_kgDONcgSBA"}
              category={"Announcements"}
              categoryId={"DIC_kwDONcgSBM4ClJ66"}
              mapping={"pathname"}
              term={"Welcome to @giscus/react component!"}
              reactionsEnabled={"1"}
              emitMetadata={"0"}
              inputPosition={"top"}
              theme={colorMode}
              lang={"ja"}
              loading={"lazy"}
              strict={"1"}
            />
          </GridItem>
        </Grid>
      </main>
    </Layout>
  );
};

export const query = graphql`
  query ArticleDetailQuery($cursor: String, $imageCursor: String) {
    allMarkdownRemark(filter: { frontmatter: { id: { eq: $cursor } } }) {
      nodes {
        excerpt(pruneLength: 140, truncate: true)
        html
        headings {
          depth
          id
          value
        }
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
    allFile(filter: { id: { eq: $imageCursor } }) {
      nodes {
        id
        childImageSharp {
          gatsbyImageData(width: 1400, height: 700, placeholder: BLURRED, quality: 100)
        }
      }
    }
  }
`;

export default ArticleDetail;

export const Head = ({
  data,
  pageContext,
  location,
}: HeadProps<Queries.ArticleDetailQueryQuery, ArticleDetailPageContext>) => {
  const { allMarkdownRemark, allFile } = data;
  const markdownRemark = allMarkdownRemark.nodes.at(0);

  const title = markdownRemark?.frontmatter?.title ?? undefined;
  const description = markdownRemark?.excerpt ?? undefined;

  const childImageSharp = allFile?.nodes.at(0)?.childImageSharp;
  const imageSrc = childImageSharp ? getSrc(childImageSharp) : undefined;

  const path = location.pathname;

  return <SEO path={path} title={title} image={imageSrc} description={description} />;
};
