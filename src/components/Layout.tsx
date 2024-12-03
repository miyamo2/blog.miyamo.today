import React from "react";
import { ReactNode } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Grid, GridItem } from "@yamada-ui/react";

interface LayoutProps {
  children: ReactNode;
  scroll?: boolean;
  isLarge: boolean;
}

export const Layout = ({
  children,
  scroll,
  isLarge,
}: LayoutProps) => {
  return (
    <div>
      <Grid w={"full"} h={"100vh"}>
        <Header
          isLarge={isLarge}
          logoPaddingLeft={isLarge ? "2xl" : "md"}
          bargerPaddingRight={isLarge ? "2xl" : "md"}
        />
        <GridItem
          w={"90vw"}
          h={"full"}
          gridArea={`2/2/9/9`}
          overflowY={scroll ? "auto" : "hidden"}
          paddingLeft={isLarge ? "2xl" : "md"}
          paddingRight={isLarge ? "2xl" : "md"}
          className={"mainContent"}
        >
          {children}
        </GridItem>
        <GridItem w={"full"} h={"full"} gridArea={"10/1/10/10"}>
          <Footer />
        </GridItem>
      </Grid>
    </div>
  );
};
