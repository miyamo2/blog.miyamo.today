import * as React from "react";
import { ReactElement } from "react";
import Layout from "./src/components/Layout";

export const wrapPageElementInner = (element: ReactElement) => {
  return <Layout>{element}</Layout>;
};
