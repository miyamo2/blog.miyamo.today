import React from "react";
import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { Box, Grid, GridItem } from "@yamada-ui/react";

interface LayoutProps {
  children: ReactNode;
  scroll?: boolean;
}

const Layout = ({
  children,
  scroll,
}: LayoutProps) => {
  return (
    <>
      <Box className={"hidden lg:block"} bg={["#ffffff", "#0d1117"]}>
        <Grid w={"full"} h={"100vh"} templateAreas={`
          "h h h h h h h h h"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "f f f f f f f f f"`}
        >
          <GridItem gridArea={"h"}>
            <Header
              logoPaddingLeft={"2xl"}
              menuPaddingRight={"2xl"}
            />
          </GridItem>
          <GridItem
            w={"90vw"}
            h={"full"}
            gridArea={"m"}
            overflowY={scroll ? "auto" : "hidden"}
            paddingLeft={"2xl"}
            paddingRight={"2xl"}
          >
            {children}
          </GridItem>
          <GridItem w={"full"} h={"full"} gridArea={"f"}>
            <Footer />
          </GridItem>
        </Grid>
      </Box>
      <Box className={"block lg:hidden"}>
        <Grid w={"full"} h={"100vh"} templateAreas={`
          "h h h h h h h h h"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "f f f f f f f f f"`}
        >
          <GridItem gridArea={"h"}>
            <Header logoPaddingLeft={"md"} menuPaddingRight={"md"} />
          </GridItem>
          <GridItem
            w={"90vw"}
            h={"full"}
            gridArea={"m"}
            overflowY={scroll ? "auto" : "hidden"}
            paddingLeft={"md"}
            paddingRight={"md"}
          >
            {children}
          </GridItem>
          <GridItem w={"full"} h={"full"} gridArea={"f"}>
            <Footer />
          </GridItem>
        </Grid>
      </Box>
    </>
  );
};

export default Layout;