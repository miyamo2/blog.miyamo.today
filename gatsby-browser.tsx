import "modern-css-reset";
import { getColorModeScript } from "@yamada-ui/core";
import { type GatsbyBrowser } from "gatsby";
import { wrapPageElementInner, wrapRootElementInner } from "./gatsby-shared";
import "prism-themes/themes/prism-dracula.css";
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
  return wrapPageElementInner(element);
};

export const wrapRootElement: GatsbyBrowser["wrapRootElement"] = ({ element }) => {
  return wrapRootElementInner(element);
};

export const onServiceWorkerUpdateFound = () => {
  window.location.reload();
};
