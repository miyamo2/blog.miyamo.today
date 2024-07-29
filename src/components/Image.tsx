import { GatsbyImage, getImage, IGatsbyImageData } from "gatsby-plugin-image";
import * as React from "react";
import { FC } from "react";

export interface AllFileConnection {
  readonly nodes: ReadonlyArray<{
    readonly id: string;
    readonly childImageSharp: { readonly gatsbyImageData: IGatsbyImageData } | null;
  }>;
}

interface ImageProps {
  allFileConnectrion?: AllFileConnection;
  alt?: string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  className?: string;
}

export const Image: FC<ImageProps> = ({
  allFileConnectrion,
  alt,
  objectFit,
  className,
}: ImageProps) => {
  const node = allFileConnectrion?.nodes?.at(0);
  if (!node) {
    return <></>;
  }
  const image = node.childImageSharp ? getImage(node.childImageSharp) : undefined;
  return image ? (
    <GatsbyImage image={image} alt={alt ?? ""} objectFit={objectFit} className={className} />
  ) : (
    <></>
  );
};
