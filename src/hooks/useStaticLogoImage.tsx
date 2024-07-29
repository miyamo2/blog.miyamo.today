import { useStaticQuery, graphql } from "gatsby";
import { AllFileConnection } from "@/components/Image";

export const useStaticLogoImage = (fileName: string): AllFileConnection | undefined => {
  const { allFile } = useStaticQuery<Queries.StaticImagesQuery>(graphql`
    query StaticImages {
      allFile {
        nodes {
          relativePath
          name
          id
          childImageSharp {
            gatsbyImageData(
              height: 65
              width: 65
              placeholder: BLURRED
              quality: 100
              layout: CONSTRAINED
            )
          }
        }
      }
    }
  `);
  const imageNode = allFile.nodes.find((n) => {
    return n.relativePath.includes(fileName);
  });
  if (!imageNode) {
    return undefined;
  }
  const connection: AllFileConnection = {
    nodes: [
      {
        id: imageNode.id,
        childImageSharp: imageNode.childImageSharp,
      },
    ],
  };
  return connection;
};
