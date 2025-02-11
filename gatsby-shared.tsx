import * as React from "react";
import { ReactElement } from "react";
import Layout from "./src/components/Layout";
import { UIProvider } from "@yamada-ui/providers";
import { Script } from "gatsby";

export const wrapRootElementInner = (element: ReactElement) => {
  return (
    <>
      <Script
        key="flackr.github.io/scroll-timeline"
        src="https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js"
      />
      {element}
    </>
  );
}

export const wrapPageElementInner = (element: ReactElement) => {
  return <UIProvider><Layout>{element}</Layout></UIProvider>;
};
