import "modern-css-reset";
import * as React from "react";
import { getColorModeScript } from "@yamada-ui/core";
import { UIProvider } from "@yamada-ui/providers";
import { GatsbyBrowser } from "gatsby";
import "@fontsource/jetbrains-mono";
import "@fontsource/m-plus-1p/400.css";
import "prism-themes/themes/prism-dracula.css";

const injectColorModeScript = () => {
  const scriptContent = getColorModeScript({
    initialColorMode: "system",
  })

  const script = document.createElement("script")

  script.textContent = scriptContent

  document.head.appendChild(script)
}
injectColorModeScript()

export const wrapPageElement: GatsbyBrowser["wrapPageElement"] = ({ element }) => {
  return <UIProvider>{element}</UIProvider>;
};