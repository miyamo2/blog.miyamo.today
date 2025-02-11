import { GatsbyBrowser, type GatsbySSR, Script, WrapRootElementNodeArgs } from "gatsby";
import { UIProvider } from "@yamada-ui/providers";
import * as React from "react";

export const wrapRootElement: GatsbyBrowser["wrapRootElement"] | GatsbySSR["wrapRootElement"] = ({ element }: WrapRootElementNodeArgs ) => {
  return (
    <UIProvider>
      <Script
        key="flackr.github.io/scroll-timeline"
        src="https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js"
      />,
      {element}
    </UIProvider>
  );
};