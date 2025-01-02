import React from "react";
import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { Grid, GridItem } from "@yamada-ui/layouts";

interface LayoutProps {
  children: ReactNode;
  scroll?: boolean;
}

const Layout = ({ children, scroll }: LayoutProps) => {
  return (
    <>
      <Grid
        w={"full"}
        h={"100vh"}
        className={"smooth-scroll"}
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
        <GridItem gridArea={"h"} bg={["#f6f8fa", "#010409"]} className={"h-fit"}>
          <div className={"flex w-full justify-center"}>
            <div className={"max-w-[1400px] w-full lg:w-[90vw] mx-4 lg:mx-0"}>
              <Header />
            </div>
          </div>
        </GridItem>
        <GridItem
          h={"full"}
          gridArea={"m"}
          overflowY={scroll ? "auto" : "hidden"}
          overflowX={"hidden"}
          className={"smooth-scroll"}
        >
          <div className={"flex w-full justify-center scrollbar-offset"}>
            <div className={"max-w-[1400px] w-full lg:w-[90vw] mx-5 lg:mx-0"}>{children}</div>
          </div>
        </GridItem>
        <GridItem w={"full"} h={"full"} gridArea={"f"}>
          <Footer />
        </GridItem>
      </Grid>
    </>
  );
};

export default Layout;
