import Link from "../../components/Link";
import RemoteImage from "../../components/RemoteImage";
import type { RemoteImageData } from "../../lib/images";
import { format } from "@formkit/tempo";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { Grid, GridItem, Separator } from "@yamada-ui/layouts";
import { Heading, Text } from "@yamada-ui/typography";
import { Tag } from "@yamada-ui/tag";
import * as React from "react";
import "./ArticleCard.css";

interface Tag {
  id: string;
  name: string;
}

interface ArticleCardProps {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  imageData: RemoteImageData | null;
  articleExcerpt?: string;
}

const ArticleCard = (props: ArticleCardProps) => {
  const cardImage = (() => {
    return props.imageData ? (
      <RemoteImage
        image={props.imageData}
        alt={`ArticleImage:${props.id}`}
        objectPosition={"center"}
        objectFit={"cover"}
        className={"transform-scaleup-then-hover-img-container h-full w-full"}
      />
    ) : (
      <></>
    );
  })();

  const createdAt = format(new Date(props.createdAt), "YYYY/MM/DD");

  return (
    <Grid
      rounded={"xl"}
      boxShadow={"md"}
      templateRows={"subgrid"}
      gridRow={"span 6"}
      gap={"sm"}
      position={"relative"}
      bg={["#f6f8fa", "#151b23"]}
      w={"full"}
      className={"transform-scaleup-then-hover article-card"}
      overflow={"hidden"}
      zIndex={"1"}
    >
      <GridItem className={"transform-scaleup-then-hover-img-wrapper article-card-thumbnail"}>
        {cardImage}
      </GridItem>
      <GridItem className={"article-card-tags"}>
        {props.tags.map((tag) => (
          <Tag
            as={Link}
            key={tag.id}
            size={"md"}
            id={`${props.id}-${tag.id}`}
            to={`/tags/${tag.id}`}
            bg={["#ddf4ff", "#121d2f"]}
          >
            #{tag.name}
          </Tag>
        ))}
      </GridItem>
      <GridItem>
        <Heading as="h2" size={"md"}>
          {/* stretched link: an <a> inside an <a> is invalid HTML (the parser
              splits the outer anchor and wrecks the prerendered layout), so the
              card itself is a div and this link covers it via ::after */}
          <Link
            to={`/articles/${props.id}`}
            aria-label={`link: ${props.title}`}
            className={"article-card-link"}
          >
            {props.title}
          </Link>
        </Heading>
      </GridItem>
      <GridItem>
        <Text color="muted">{props.articleExcerpt}</Text>
      </GridItem>
      <GridItem>
        <Separator />
      </GridItem>
      <GridItem>
        <Text>
          <FontAwesomeIcon icon={faCalendarDay} paddingRight={"sm"} />
          {createdAt}
        </Text>
      </GridItem>
    </Grid>
  );
};

export default ArticleCard;
