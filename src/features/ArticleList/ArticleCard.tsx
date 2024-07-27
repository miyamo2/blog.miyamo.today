import React, { FC } from "react";
import { Link } from "gatsby";
import { Heading, Text, Tag, Divider, Grid, GridItem } from "@yamada-ui/react";
import { ImageDataLike } from "gatsby-plugin-image/dist/src/components/hooks";
import { GatsbyImage, getImage } from "gatsby-plugin-image";
import { format } from "@formkit/tempo";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Tag {
  id: string;
  name: string;
}

interface VerticalArticleCardProps {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  imageData?: ImageDataLike;
  articleExcerpt?: string;
}

export const ArticleCard: FC<VerticalArticleCardProps> = (props: VerticalArticleCardProps) => {
  const gatsbyImage = (() => {
    const image = props.imageData ? getImage(props.imageData) : undefined;
    return image ? (
      <GatsbyImage
        image={image}
        alt={`ArticleImage:${props.id}`}
        objectFit={"cover"}
        className={"transform-scaleup-then-hover"}
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
      padding={"sm"}
      as={Link}
      to={`/articles/${props.id}`}
    >
      <GridItem>{gatsbyImage}</GridItem>
      <GridItem>
        {props.tags.map((tag) => (
          <Tag
            as={Link}
            size={"md"}
            id={`${props.id}-${tag.id}`}
            to={`/tags/${tag.id}`}
            colorScheme="gray"
          >
            #{tag.name}
          </Tag>
        ))}
      </GridItem>
      <GridItem>
        <Heading as="h4" size={"md"}>
          {props.title}
        </Heading>
      </GridItem>
      <GridItem>
        <Text color="muted">{props.articleExcerpt}</Text>
      </GridItem>
      <GridItem>
        <Divider />
      </GridItem>
      <GridItem>
        <Text>
          <FontAwesomeIcon icon={faCalendarDay} />
          {createdAt}
        </Text>
      </GridItem>
      <Link to={`/articles/${props.id}`}></Link>
    </Grid>
  );
};
