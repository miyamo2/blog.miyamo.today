import { GatsbyImage, getImage, IGatsbyImageData } from "gatsby-plugin-image";
import * as React from "react";

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

const Image = ({ allFileConnectrion, alt, objectFit, className }: ImageProps) => {
  const node = allFileConnectrion?.nodes?.at(0);
  if (!node) {
    return <></>;
  }
  const image = node.childImageSharp ? getImage(node.childImageSharp) : undefined;
  return image ? (
    <GatsbyImage image={image} alt={alt ?? ""} objectPosition={"center"} objectFit={objectFit} className={className} />
  ) : (
    <></>
  );
};

export default Image;
