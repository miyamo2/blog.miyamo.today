import { navigate } from "gatsby";
import { Heading, useMediaQuery, Text, Button } from "@yamada-ui/react";
import * as React from "react";
import { Layout } from "../components/Layout";
import SEO from "../components/SEO";

const NotFound = () => {
  const [isLarge] = useMediaQuery(["(min-width: 1280px)"]);
  return (
    <Layout scroll={false} isLarge={isLarge}>
      <main>
        <Heading className={"text-black text-3xl font-bold"} paddingBottom={"md"}>
          Page Not Found
        </Heading>
        <Text>Oops! This page has been removed or relocated.</Text>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </main>
    </Layout>
  );
};

export default NotFound;

export const Head = () => {
  return <SEO />;
};
