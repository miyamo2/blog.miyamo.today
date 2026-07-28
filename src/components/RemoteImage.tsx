import * as React from "react";
import type { CSSProperties } from "react";
import type { RemoteImageData } from "../lib/images";

export interface RemoteImageProps {
  image?: RemoteImageData | null;
  alt?: string;
  objectFit?: CSSProperties["objectFit"];
  objectPosition?: string;
  className?: string;
  loading?: "eager" | "lazy";
}

/**
 * Drop-in replacement for gatsby-plugin-image's GatsbyImage.
 * Renders the optimized remote image with a blurred placeholder background.
 */
const RemoteImage = ({
  image,
  alt,
  objectFit,
  objectPosition,
  className,
  loading = "lazy",
}: RemoteImageProps) => {
  if (!image) {
    return <></>;
  }
  // transparent svg spacer keeps the intrinsic size, like gatsby-plugin-image's
  // constrained layout, so the wrapper works in auto-sized containers too
  const sizerSvg = `data:image/svg+xml;charset=utf-8,%3Csvg height='${image.height}' width='${image.width}' xmlns='http://www.w3.org/2000/svg' version='1.1'%3E%3C/svg%3E`;
  return (
    <div
      className={className ? `remote-image-wrapper ${className}` : "remote-image-wrapper"}
      style={{
        position: "relative",
        overflow: "hidden",
        display: "inline-block",
        verticalAlign: "top",
        width: "100%",
        maxWidth: `${image.width}px`,
        ...(image.placeholder
          ? {
              backgroundImage: `url('${image.placeholder}')`,
              backgroundSize: "cover",
              backgroundPosition: objectPosition ?? "center",
            }
          : {}),
      }}
    >
      <img
        aria-hidden="true"
        role="presentation"
        alt=""
        src={sizerSvg}
        style={{ maxWidth: "100%", width: "100%", display: "block", position: "static" }}
      />
      <img
        src={image.src}
        srcSet={image.srcSet}
        alt={alt ?? ""}
        loading={loading}
        decoding="async"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: objectFit ?? "cover",
          objectPosition: objectPosition ?? "center",
        }}
      />
    </div>
  );
};

export default RemoteImage;
