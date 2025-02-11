import "modern-css-reset";
import { getColorModeScript } from "@yamada-ui/core";
import { GatsbyBrowser, Script } from "gatsby";
import "prism-themes/themes/prism-dracula.css";
import "./src/styles/global.css";
import { wrapPageElementInner } from "./gatsby-shared";
import { UIProvider } from "@yamada-ui/providers";
import * as React from "react";

const injectColorModeScript = () => {
  const scriptContent = getColorModeScript({
    initialColorMode: "system",
  });

  const script = document.createElement("script");

  script.textContent = scriptContent;

  document.head.appendChild(script);
};
injectColorModeScript();

export const wrapPageElement: GatsbyBrowser["wrapPageElement"] = ({ element }) => {
  return wrapPageElementInner(element);
};

export const wrapRootElement: GatsbyBrowser["wrapRootElement"] = ({ element }) => {
  return (
    <UIProvider>
      <Script
        key="flackr.github.io/scroll-timeline"
        src="https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js"
      />
      ,{element}
    </UIProvider>
  );
};

export const onServiceWorkerUpdateFound = () => {
  window.location.reload();
};
