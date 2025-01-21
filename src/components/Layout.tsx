import React from "react";
import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { Box, Flex, Grid, GridItem } from "@yamada-ui/layouts";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div id={"layout"}>
      <Grid
        w={"full"}
        h={"100vh"}
        templateAreas={`
          "header"
          "content"
          `}
        templateRows={"70px auto"}
        bg={["#ffffff", "#0d1117"]}
        overflowY={"visible"}
      >
        <GridItem gridArea={"header"} bg={["#f6f8fa", "#010409"]} alignSelf={"start"}>
          <Flex className={"w-full justify-center"}>
            <div className={"max-w-[1400px] w-full lg:w-[95vw] mx-4 lg:mx-0"}>
              <Header />
            </div>
          </Flex>
        </GridItem>
        <GridItem
          h={"full"}
          gridArea={"content"}
          className={"smooth-scroll"}
          overflowY={"scroll"}
          alignSelf={"start"}
          paddingTop={"1em"}
        >
          <Flex className={"w-full h-full justify-between flex-col scrollbar-offset"}>
            <Flex className={"w-full justify-center"} justifySelf={"start"}>
              <Box
                className={"max-w-[1400px] w-full lg:w-[95vw] mx-5 lg:mx-0 pb-[64px] lg:pb-0"}
                justifySelf={"Start"}
              >
                {children}
              </Box>
            </Flex>
            <Box w={"full"} alignSelf={"end"}>
              <Footer />
            </Box>
          </Flex>
        </GridItem>
      </Grid>
    </div>
  );
};

export default Layout;
