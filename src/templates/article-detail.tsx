import { graphql, HeadProps, Link, PageProps } from "gatsby";
import * as React from "react";
import { ArticleDetailPageContext } from "../../gatsby-node";
import {
  Box,
  Grid,
  GridItem,
  HStack,
  Separator,
} from "@yamada-ui/layouts";
import {
  Accordion,
  AccordionItem,
  AccordionLabel,
  AccordionPanel,
} from "@yamada-ui/accordion";
import { Tag } from "@yamada-ui/tag";
import { Heading } from "@yamada-ui/typography";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faCalendarDay, faListUl } from "@fortawesome/free-solid-svg-icons";
import { format } from "@formkit/tempo";
import { getSrc } from "gatsby-plugin-image";
import Layout from "../components/Layout";
import Image from "../components/Image";
import SEO from "../components/SEO";
import "./article-detail.css"
import { useColorMode } from "@yamada-ui/core";
import Giscus from "@giscus/react";

const ArticleDetail = ({
  data,
  pageContext,
}: PageProps<Queries.ArticleDetailQueryQuery, ArticleDetailPageContext>) => {
  const { colorMode } = useColorMode();
  const allFileConnection = data.allFile;

  const frontmatter = pageContext.frontmatter;
  if (!frontmatter) {
    return <></>;
  }

  const createdAt = format(new Date(frontmatter.createdAt ?? ""), "YYYY/MM/DD");

  return (
    <Layout
      scroll={true}
    >
      <main>
        <div className={"hidden lg:block w-full"}>
          <Grid
            templateAreas={`
            "title title title title title title"
            "tag tag tag tag tag tag"
            "date date date date date date"
            "image image image image image image"
            "content content content content toc toc"
            "comment comment comment comment comment comment"`
          }
            className={"justify-start"}
          >
            <GridItem gridArea={"title"}>
              <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
                {frontmatter.title}
              </Heading>
            </GridItem>
            <GridItem gridArea={"tag"}>
              <HStack gridArea={"tag"}>
                {frontmatter.tags?.map((tag) => (
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
              </HStack>
            </GridItem>
            <GridItem gridArea={"date"}>
              <Box paddingTop={"md"} paddingBottom={"md"}>
                <FontAwesomeIcon icon={faCalendarDay} paddingRight={"sm"} />&nbsp;{createdAt}
              </Box>
            </GridItem>
            <GridItem gridArea={"image"}>
              <Image
                allFileConnectrion={allFileConnection}
                alt={`ArticleImage:${pageContext.cursor}`}
                objectFit={"cover"}
              />
            </GridItem>
            <GridItem gridArea={"toc"} justifySelf={"start"} w={"full"}>
              {ArticleTOC(pageContext.tableOfContents ?? "", true)}
            </GridItem>
            <GridItem gridArea={"content"}>
              <article>
                <div
                  dangerouslySetInnerHTML={{
                    __html: pageContext.html ?? "",
                  }}
                  className={"markdown-body"}
                ></div>
              </article>
            </GridItem>
            <GridItem gridArea={"comment"} justifySelf={"stretch"}>
              <Separator paddingY={"sm"} />
              <Giscus
                id={"comments"}
                repo={"miyamo2/giscus-playground"}
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
        </div>
        <div className={"block lg:hidden w-full"}>
          <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
            {frontmatter.title}
          </Heading>
          <HStack>
            {frontmatter.tags?.map((tag) => (
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
          </HStack>
          <Box paddingTop={"md"} paddingBottom={"md"}>
            <FontAwesomeIcon icon={faCalendarDay} />
            {createdAt}
          </Box>
          <Grid
            templateAreas={`
          "image image image"
          "content content content"
          "comment comment comment"
        `}>
            <GridItem gridArea={"image"} justifySelf={"center"}>
              <Image
                allFileConnectrion={allFileConnection}
                alt={`ArticleImage:${pageContext.cursor}`}
                objectFit={"cover"}
              />
            </GridItem>
            <GridItem gridArea={"content"} justifySelf={"stretch"}>
              <article>
                { ArticleTOC(pageContext.tableOfContents ?? "", false) }
                <div
                  dangerouslySetInnerHTML={{
                    __html: pageContext.html ?? "",
                  }}
                  className={"markdown-body"}
                ></div>
              </article>
            </GridItem>
            <GridItem gridArea={"comment"} justifySelf={"stretch"}>
              <Separator paddingTop={"sm"} />
              <Giscus
                id={"comments"}
                repo={"miyamo2/giscus-playground"}
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
        </div>
      </main>
    </Layout>
  );
};

const ArticleTOC = (toc: string, isLarge: boolean) =>  {
  return (
      <>
        {isLarge ? (
          <Box w={"full"} top={0}>
            <Heading as={"h2"} paddingBottom={"md"}>
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
              <AccordionItem w={"full"}>
                <AccordionLabel className={"text-2xl font-bold"} >
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
          gatsbyImageData(width: 1280, height: 720, placeholder: BLURRED, quality: 100)
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