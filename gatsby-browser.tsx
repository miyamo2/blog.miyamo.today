import "modern-css-reset";
import * as React from "react";
import { getColorModeScript } from "@yamada-ui/core";
import { GatsbyBrowser } from "gatsby";
import "prism-themes/themes/prism-dracula.css";
import { wrapRootElement as sharedWrapRootElement } from "./gatsby-shared";
import Layout from "./src/components/Layout";
import "./src/styles/global.css";

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
  return <Layout>{element}</Layout>;
};

export const wrapRootElement: GatsbyBrowser["wrapRootElement"] = sharedWrapRootElement;

export const onServiceWorkerUpdateFound = () => {
  window.location.reload();
};
