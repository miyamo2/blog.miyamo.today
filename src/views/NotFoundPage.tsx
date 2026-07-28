import * as React from "react";
import { Heading, Text } from "@yamada-ui/typography";
import { Button } from "@yamada-ui/button";
import Layout from "../components/Layout";
import { navigate } from "../lib/navigate";

const NotFoundPage = () => {
  return (
    <Layout>
      <main>
        <div className={"text-center w-full"}>
          <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
            Page Not Found
          </Heading>
          <Text>Oops! This page has been removed or relocated.</Text>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </main>
    </Layout>
  );
};

export default NotFoundPage;
