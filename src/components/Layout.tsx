import React from "react";
import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { Grid, GridItem } from "@yamada-ui/layouts";

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
        <Grid w={"full"} h={"100vh"} className={"smooth-scroll"} templateAreas={`
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
          <GridItem gridArea={"h"}>
            <Header />
          </GridItem>
          <GridItem
            h={"full"}
            gridArea={"m"}
            overflowY={scroll ? "auto" : "hidden"}
            className={"smooth-scroll"}
          >
            <div className={"flex w-full justify-center"}>
              <div className={"max-w-[1280px] w-[90vw]"}>{children}</div>
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