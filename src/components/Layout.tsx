import React from "react";
import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Grid, GridItem } from "@yamada-ui/react";

interface LayoutProps {
  sideNavLeftRender?: (prop: SideNavRenderProps) => ReactNode;
  sideNavRightRender?: (prop: SideNavRenderProps) => ReactNode;
  children: ReactNode;
  scroll?: boolean;
  isLarge: boolean;
}

export interface SideNavRenderProps {
  isLarge: boolean;
}

export const Layout = ({
  children,
  sideNavLeftRender,
  sideNavRightRender,
  scroll,
  isLarge,
}: LayoutProps) => {
  const containsSideNavLeft = sideNavLeftRender !== undefined;
  const containsSideNavRight = sideNavRightRender !== undefined;

  const mainColStart = containsSideNavLeft ? 2 : 1;
  const mainColEnd = containsSideNavRight ? 9 : 10;

  return (
    <div>
      <Grid w={"full"} h={"100vh"}>
        <Header
          isLarge={isLarge}
          logoPaddingLeft={!containsSideNavLeft ? (isLarge ? "2xl" : "md") : "md"}
          bargerPaddingRight={!containsSideNavRight ? (isLarge ? "2xl" : "md") : "md"}
        />
        {containsSideNavLeft && isLarge ? (
          <GridItem
            w={"full"}
            h={"full"}
            gridArea={"2/1/9/2"}
            overflowY={"hidden"}
            className={"sideNavBar"}
          >
            <aside>{sideNavLeftRender({ isLarge: isLarge })}</aside>
          </GridItem>
        ) : (
          <></>
        )}
        <GridItem
          w={"full"}
          h={"full"}
          gridArea={`2/${mainColStart}/9/${mainColEnd}`}
          overflowY={scroll ? "auto" : "hidden"}
          paddingLeft={!containsSideNavLeft ? (isLarge ? "2xl" : "md") : "md"}
          paddingRight={!containsSideNavRight ? (isLarge ? "2xl" : "md") : "md"}
          className={"mainContent"}
        >
          {children}
        </GridItem>
        {containsSideNavRight && isLarge ? (
          <GridItem w={"full"} h={"full"} gridArea={"2/9/9/10"} overflowY={"hidden"}>
            <aside>{sideNavRightRender({ isLarge: isLarge })}</aside>
          </GridItem>
        ) : (
          <></>
        )}
        <GridItem w={"full"} h={"full"} gridArea={"10/1/10/10"} className={"sideNavBar"}>
          <Footer />
        </GridItem>
      </Grid>
    </div>
  );
};
