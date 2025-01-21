import React from "react";
import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { Box, Grid, GridItem } from "@yamada-ui/layouts";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div id={"layout"} className={"smooth-scroll"}>
      <Box h={"70px"} w={"full"} bg={["#f6f8fa", "#010409"]} className={"header"}>
        <div className={"flex w-full justify-center"} >
          <div className={"max-w-[1400px] w-full lg:w-[90vw] mx-4 lg:mx-0"}>
            <Header />
          </div>
        </div>
      </Box>
      <Grid
        id={"content"}
        w={"full"}
        h={"100vh"}
        className={"scrollbar-offset"}
        templateAreas={`
          "h h h h h h h h h"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "m m m m m m m m m"
          "f f f f f f f f f"`}
        bg={["#ffffff", "#0d1117"]}
      >
        <GridItem gridArea={"h"} h={"70px"} bg={["#f6f8fa", "#010409"]} className={"header"} alignSelf={"start"}>
          <div className={"flex w-full justify-center"} >
            <div className={"max-w-[1400px] w-full lg:w-[90vw] mx-4 lg:mx-0"}>
              <Header />
            </div>
          </div>
        </GridItem>
        <GridItem
          h={"full"}
          gridArea={"m"}
        >
          <div className={"flex w-full h-full justify-center"}>
            <div className={"max-w-[1400px] w-full h-full lg:w-[95vw] mx-5 lg:mx-0 pb-[64px] lg:pb-0"}>
              {children}
            </div>
          </div>
        </GridItem>
        <GridItem w={"full"} h={"full"} gridArea={"f"} alignSelf={"end"}>
          <Footer />
        </GridItem>
      </Grid>
    </div>
  );
};

export default Layout;
