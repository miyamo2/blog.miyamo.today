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
          <div className={"max-w-[1400px] w-full lg:w-[95vw] mx-4 lg:mx-0"}>
            <Header />
          </div>
        </div>
      </Box>
      <Grid
        id={"content"}
        w={"full"}
        className={"scrollbar-offset"}
        templateAreas={`
          "m"
          "f"`}
        bg={["#ffffff", "#0d1117"]}
      >
        <GridItem
          gridArea={"m"}
        >
          <div className={"flex w-full justify-center"}>
            <div className={"max-w-[1400px] w-full lg:w-[95vw] mx-5 lg:mx-0 pb-[64px] lg:pb-0"}>
              {children}
            </div>
          </div>
        </GridItem>
        <GridItem w={"full"} gridArea={"f"} alignSelf={"end"}>
          <Footer />
        </GridItem>
      </Grid>
    </div>
  );
};

export default Layout;
