import React from "react";
import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { Box, Grid, GridItem, Spacer } from "@yamada-ui/layouts";

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
            h={"full"}
            gridArea={"m"}
            overflowY={scroll ? "auto" : "hidden"}
            overflowX={"hidden"}
          >
            <div className={"flex w-full justify-center"}>
              <div className={"w-full max-w-[1280px] w-[90vw]"}>{children}</div>
            </div>
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
            h={"full"}
            gridArea={"m"}
            overflowY={scroll ? "auto" : "hidden"}
            overflowX={"hidden"}
            justifySelf={"center"}
          >
            <div className={"w-[90vw]"}>{children}</div>
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