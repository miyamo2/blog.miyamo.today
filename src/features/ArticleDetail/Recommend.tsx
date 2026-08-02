import React from "react";
import { Box, Grid, GridItem } from "@yamada-ui/layouts";
import Link from "../../components/Link";
import { Heading, Text } from "@yamada-ui/typography";
import RemoteImage from "../../components/RemoteImage";
import type { RemoteImageData } from "../../lib/images";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";
import { format } from "@formkit/tempo";
import "./Recommend.css";

interface RecommendArticleProps {
  reccomends?: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly excerpt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly imageData: RemoteImageData | null;
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
            key={recommend?.id}
            id={recommend?.id ?? ""}
            title={recommend?.title ?? ""}
            excerpt={recommend?.excerpt ?? ""}
            createdAt={recommend?.createdAt ?? "1970-01-01"}
            imageData={recommend?.imageData ?? undefined}
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
  readonly imageData?: RemoteImageData;
}

const Recommend = (props: RecommendArticleCardProps) => {
  const cardImage = (() => {
    return props.imageData ? (
      <RemoteImage
        image={props.imageData}
        alt={`ArticleImage:${props.id}`}
        objectPosition={"center"}
        objectFit={"cover"}
        className={"transform-scaleup-then-hover-img-container h-full"}
      />
    ) : (
      <></>
    );
  })();

  const createdAt = format(new Date(props.createdAt ?? ""), "YYYY/MM/DD");

  return (
    <Link to={`/articles/${props.id}`}>
      <Grid
        className={"recommend-card"}
        bg={["", "#121820"]}
        marginBottom={"sm"}
        rounded={"lg"}
        boxShadow={"md"}
      >
        <GridItem gridArea={"image"} className={"recommend-card_thumbnail"}>
          {cardImage}
        </GridItem>
        <GridItem gridArea={"title"} className={"recommend-card_title"}>
          <Heading as={"h3"} size={"sm"}>
            {props.title}
          </Heading>
        </GridItem>
        <GridItem gridArea={"desc"} className={"recommend-card_description"}>
          <Text className={"text-xs"}>{props.excerpt}</Text>
        </GridItem>
        <GridItem gridArea={"date"} className={"recommend-card_created flex"}>
          <Text className={"recommend-card_created_inner"}>
            <FontAwesomeIcon icon={faCalendarDay} paddingRight={"sm"} />
            {createdAt}
          </Text>
        </GridItem>
      </Grid>
    </Link>
  );
};
