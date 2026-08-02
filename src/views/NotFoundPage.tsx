import * as React from "react";
import { Heading, Text } from "@yamada-ui/typography";
import { Button } from "@yamada-ui/button";
import { navigate } from "../lib/navigate";

const NotFoundPage = () => {
  return (
    <main className={"flex min-h-[60vh] w-full items-center justify-center"}>
      <div className={"text-center w-full"}>
        <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
          Page Not Found
        </Heading>
        <Text paddingBottom={"md"}>Oops! This page has been removed or relocated.</Text>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    </main>
  );
};

export default NotFoundPage;
