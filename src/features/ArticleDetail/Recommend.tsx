import React from "react";
import { Box, Grid, GridItem } from "@yamada-ui/layouts";
import { graphql, Link, useStaticQuery } from "gatsby";
import { Heading, Text } from "@yamada-ui/typography";
import { GatsbyImage, IGatsbyImageData } from "gatsby-plugin-image";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";

interface RecommendArticleProps {
  reccomends?: ReadonlyArray<
    {
      readonly frontmatter: {
        readonly id: string | null,
        readonly title: string | null,
        readonly createdAt: string | null,
        readonly updatedAt: string | null,
        readonly tags: ReadonlyArray<
          {
            readonly id: string | null,
            readonly name: string | null,
          } | null> | null
      } | null
    } | null> | null
}

export const ReccomendArticles = (props: RecommendArticleProps) => {
  const { allFile: recommendArticleCardImages } = useStaticQuery<Queries.RecommendArticleCardImagesQuery>(graphql`
      query RecommendArticleCardImages {
          allFile(filter: {id: {regex: "/ArticleImage.*/"}}) {
              nodes {
                  id
                  childImageSharp {
                      gatsbyImageData(width: 480, height: 380, placeholder: BLURRED, quality: 100)
                  }
              }
          }
      }
  `)

  return (
    <Box w={"full"} paddingLeft={"0.5em"} className={"lg:pl-[0.5em]"}>
      <Box
        w={"full"}
        className={"backdrop-blur-md"}
        writingMode={"horizontal-tb"}
      >
        <Heading
          as={"h2"}
          paddingY={"sm"}
          size={"md"}
          className={"font-bold"}
          whiteSpace={"nowrap"}
        >
          <FontAwesomeIcon icon={faThumbsUp} paddingRight={"sm"} />
          Recommend Articles
        </Heading>
      </Box>
      {
        props?.reccomends?.map((recommend) => {
          return (
            <Recommend
              id={recommend?.frontmatter?.id ?? ""}
              title={recommend?.frontmatter?.title ?? ""}
              gatsbyImageData={
              recommendArticleCardImages.nodes.find(
                (node) => { return node.id === `ArticleImage:${recommend?.frontmatter?.id}`})?.childImageSharp?.gatsbyImageData ?? null}
            />
          );
        })
      }
    </Box>
  )
}


interface RecommendArticleCardProps {
  id: string;
  title: string;
  readonly gatsbyImageData: IGatsbyImageData | null;
}

const Recommend = (props: RecommendArticleCardProps) => {
  const gatsbyImage = (() => {
    return props.gatsbyImageData ? (
      <GatsbyImage
        image={props.gatsbyImageData}
        alt={`ArticleImage:${props.id}`}
        objectFit={"cover"}
        className={"transform-scaleup-then-hover-img-container"}
      />
    ) : (
      <></>
    );
  })();

  return (
    <Grid
      rounded={"lg"}
      boxShadow={"md"}
      templateAreas={`
        "detail image"
      `}
      bg={["", "#121820"]}
      templateColumns={"60% 40%"}
      gap={"sm"}
      as={Link}
      to={`/articles/${props.id}`}
      aria-label={`link: ${props.title}`}
      w={"full"}
      className={"transform-scaleup-then-hover isolate"}
      overflow={"hidden"}
    >
      <GridItem gridArea={"image"} className={"transform-scaleup-then-hover-img-wrapper"}>{gatsbyImage}</GridItem>
      <GridItem gridArea={"detail"}>
        <Text size={"md"}>
          {props.title}
        </Text>
      </GridItem>
    </Grid>
  );
}