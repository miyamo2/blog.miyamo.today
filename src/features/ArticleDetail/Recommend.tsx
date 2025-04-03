import React from "react";
import { Box, VStack, Flex } from "@yamada-ui/layouts";
import { Link } from "gatsby";
import { Heading } from "@yamada-ui/typography";
import { GatsbyImage, IGatsbyImageData } from "gatsby-plugin-image";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";
import { format } from "@formkit/tempo";
import "./Recommend.css";

interface RecommendArticleProps {
  reccomends?: ReadonlyArray<{
    readonly frontmatter: {
      readonly id: string | null;
      readonly title: string | null;
      readonly createdAt: string | null;
      readonly updatedAt: string | null;
      readonly tags: ReadonlyArray<{
        readonly id: string | null;
        readonly name: string | null;
      } | null> | null;
    } | null;
    readonly excerpt: string | null;
    readonly thumbnail: {
      readonly childImageSharp: {
        readonly gatsbyImageData: IGatsbyImageData;
      } | null;
    } | null;
  } | null> | null;
}

export const ReccomendArticles = (props: RecommendArticleProps) => {
  return (
    <Box w={"full"} paddingLeft={"0.5em"} className={"lg:pl-[0.5em]"}>
      <Box w={"full"} className={"backdrop-blur-md"} writingMode={"horizontal-tb"}>
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
      {props?.reccomends?.map((recommend) => {
        return (
          <Recommend
            id={recommend?.frontmatter?.id ?? ""}
            title={recommend?.frontmatter?.title ?? ""}
            excerpt={recommend?.excerpt ?? ""}
            createdAt={recommend?.frontmatter?.createdAt ?? "1970-01-01"}
            gatsbyImageData={recommend?.thumbnail?.childImageSharp?.gatsbyImageData}
          />
        );
      })}
    </Box>
  );
};

interface RecommendArticleCardProps {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  readonly gatsbyImageData?: IGatsbyImageData;
}

const Recommend = (props: RecommendArticleCardProps) => {
  const gatsbyImage = (() => {
    return props.gatsbyImageData ? (
      <GatsbyImage
        image={props.gatsbyImageData}
        alt={`ArticleImage:${props.id}`}
        objectPosition={"center"}
        objectFit={"cover"}
        className={"transform-scaleup-then-hover-img-container"}
      />
    ) : (
      <></>
    );
  })();

  const createdAt = format(new Date(props.createdAt ?? ""), "YYYY/MM/DD");

  return (
    <Link to={`/articles/${props.id}`}>
      <Flex
        className={"recommend-card"}
        h={"128px"}
        bg={["", "#121820"]}
        marginBottom={"sm"}
        rounded={"lg"}
        boxShadow={"md"}
      >
        <Flex overflow={"hidden"} textOverflow={"ellipsis"} className={"recommend-card_body_wrapper"}>
          <VStack gap="0" className={"recommend-card_body"}>
            <Heading as={"h3"} size="sm" className={"recommend-card_title"}>
              {props.title}
            </Heading>
            <Box className={"recommend-card_description"} color={"muted"}>{props.excerpt}</Box>
            <Flex className={"recommend-card_created"} justifyContent={"end"} direction={"column"}>
              <p><FontAwesomeIcon icon={faCalendarDay} paddingRight={"sm"} />{createdAt}</p>
            </Flex>
          </VStack>
        </Flex>
        {gatsbyImage}
      </Flex>
    </Link>
  );
};
