import { navigate } from "gatsby";
import { Heading, Text, Button } from "@yamada-ui/react";
import * as React from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";

const NotFound = () => {
  return (
    <Layout scroll={false}>
      <main>
        <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
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
