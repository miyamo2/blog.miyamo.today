import { ImageDataLike } from "gatsby-plugin-image/dist/src/components/hooks";
import { IGatsbyImageData } from "gatsby-plugin-image";

export interface Tag {
  id: string;
  name: string;
}

export interface ArticleCardData {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  imageData?: ImageDataLike;
  articleExcerpt?: string;
}

interface ArticleCardRemarkNode {
  readonly excerpt: string | null,
  readonly frontmatter: {
    readonly id: string | null,
    readonly title: string | null,
    readonly createdAt: string | null,
    readonly updatedAt: string | null,
    readonly tags: ReadonlyArray<{
      readonly id: string | null,
      readonly name: string | null,
    } | null> | null,
  } | null
}

interface FileEdge {
  readonly node: {
    readonly id: string,
    readonly childImageSharp: {
      readonly gatsbyImageData: IGatsbyImageData,
    } | null
  }
}

export const useArticleCardList = (articleCardRemarkNodes: ReadonlyArray<ArticleCardRemarkNode>, allFileEdges: ReadonlyArray<FileEdge>) => {
  return articleCardRemarkNodes.map((node): ArticleCardData | undefined => {
      const frontmatter = node.frontmatter;
      if (!frontmatter) {
        return undefined;
      }

      const imageDataEdge = allFileEdges.find(
        (edge: { node: { id: string } }) => edge.node.id === `ArticleImage:${frontmatter.id}`
      );
      const imageData = imageDataEdge?.node.childImageSharp || undefined;
      const articleExcerpt = node.excerpt ?? undefined;

      const { id, title, createdAt, updatedAt, tags } = frontmatter;
      if (!id || !title || !createdAt || !updatedAt) {
        return undefined;
      }

      const articleCardData: ArticleCardData = {
        id: id,
        title: title,
        createdAt: createdAt,
        updatedAt: updatedAt,
        tags:
          tags
            ?.filter((tag) => tag !== undefined && tag !== null)
            .map((tag) => {
              return { id: tag.id ?? "", name: tag.name ?? "" };
            }) ?? Array.of<Tag>(),
        imageData: imageData,
        articleExcerpt: articleExcerpt,
      };
      return articleCardData;
    })
    .filter((data: ArticleCardData | undefined) => data !== undefined);
};