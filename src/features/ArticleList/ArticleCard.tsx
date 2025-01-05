import { Link } from "gatsby";
import { ImageDataLike } from "gatsby-plugin-image/dist/src/components/hooks";
import { GatsbyImage, getImage } from "gatsby-plugin-image";
import { format } from "@formkit/tempo";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { Grid, GridItem, Separator } from "@yamada-ui/layouts";
import { Heading, Text } from "@yamada-ui/typography";
import { Tag } from "@yamada-ui/tag";
import * as React from "react";

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
  imageData?: ImageDataLike;
  articleExcerpt?: string;
}

const ArticleCard = (props: ArticleCardProps) => {
  const gatsbyImage = (() => {
    const image = props.imageData ? getImage(props.imageData) : undefined;
    return image ? (
      <GatsbyImage
        image={image}
        alt={`ArticleImage:${props.id}`}
        objectFit={"cover"}
        className={"transform-scaleup-then-hover-img-container"}
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
      as={Link}
      to={`/articles/${props.id}`}
      aria-label={`link: ${props.title}`}
      bg={["#f6f8fa", "#151b23"]}
      w={"full"}
      className={"max-w-[750px] lg:max-w-[303px] transform-scaleup-then-hover isolate"}
      overflow={"hidden"}
    >
      <GridItem className={"transform-scaleup-then-hover-img-wrapper"}>{gatsbyImage}</GridItem>
      <GridItem>
        {props.tags.map((tag) => (
          <Tag
            as={Link}
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
          {props.title}
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
