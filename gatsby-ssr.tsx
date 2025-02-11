import type { GatsbySSR } from "gatsby";
import React from "react";

export const onRenderBody: GatsbySSR["onRenderBody"] = ({
  setHeadComponents,
  setPostBodyComponents,
}) => {
  setHeadComponents([
    <link
      rel="preload"
      href="/fonts/UDEVGothic35HS-Regular-Subset.woff2"
      as="font"
      type="font/woff2"
      crossOrigin="anonymous"
      key="interFont"
    />,
    <link
      rel="preload"
      href="/fonts/UDEVGothic35HS-Bold-Subset.woff2"
      as="font"
      type="font/woff2"
      crossOrigin="anonymous"
      key="interFont"
    />,
    <link
      rel="preload"
      href="/fonts/UDEVGothic35HS-Italic-Subset.woff2"
      as="font"
      type="font/woff2"
      crossOrigin="anonymous"
      key="interFont"
    />,
    <link
      rel="preload"
      href="/fonts/UDEVGothic35HS-BoldItalic-Subset.woff2"
      as="font"
      type="font/woff2"
      crossOrigin="anonymous"
      key="interFont"
    />,
  ]);
  setPostBodyComponents([
    <script
      key="flackr.github.io/scroll-timeline"
      src="https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js" />,
    <script
      key="bmcWidget"
      data-name="BMC-Widget"
      src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
      data-id="miyamo2"
      data-description="Support me on Buy me a coffee!"
      data-message=""
      data-color="#186BF2"
      data-position="Right"
      data-x_margin="18"
      data-y_margin="18"
    />,
  ]);
};
