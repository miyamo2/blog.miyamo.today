import React from "react";
import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { Box, Flex } from "@yamada-ui/layouts";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Box id={"layout"} bg={["#ffffff", "#0d1117"]} w={"full"} h={"100vh"} className={"scrollable-y smooth-scroll scroll-padding"}>
        <Flex h={"70px"} bg={["#f6f8fa", "#010409"]} className={"header-wrapper scrollbar-offset"}>
          <Flex className={"w-full justify-center"}>
            <div className={"max-w-[1400px] w-full lg:w-[95vw] mx-4 lg:mx-0"}>
              <Header />
            </div>
          </Flex>
        </Flex>
        <Flex
          h={"full"}
          alignSelf={"start"}
          id={"content"}
        >
          <Flex className={"w-full h-full justify-between flex-col scrollbar-offset"}>
            <Flex className={"w-full justify-center"} justifySelf={"start"}>
              <Box
                className={"max-w-[1400px] w-full lg:w-[95vw] mx-5 lg:mx-0"}
                justifySelf={"start"}
              >
                {children}
              </Box>
            </Flex>
            <Box w={"full"} alignSelf={"end"}>
              <Footer />
            </Box>
          </Flex>
        </Flex>
      </Box>
    </>
  );
};

export default Layout;
