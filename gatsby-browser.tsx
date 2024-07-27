import "@fontsource/jetbrains-mono";
import "@fontsource/m-plus-1p/400.css";
import "./src/styles/global.css";
import * as React from "react";
import { UIProvider } from "@yamada-ui/react";
import { GatsbyBrowser } from "gatsby";

export const wrapPageElement: GatsbyBrowser["wrapPageElement"] = ({ element }) => {
  return <UIProvider>{element}</UIProvider>;
};
