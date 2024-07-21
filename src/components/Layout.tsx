import React from "react";
import { ReactNode } from "react"
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Grid, GridItem, Spacer } from "@yamada-ui/react"

interface LayoutProps {
    sideNavLeftRender?: (prop: SideNavRenderProps) => ReactNode;
    sideNavRightRender?: (prop: SideNavRenderProps) => ReactNode;
    children: ReactNode;
    scroll?: boolean;
    isLarge: boolean;
};

export interface SideNavRenderProps {
    isLarge: boolean;
}

export const Layout = ({ children, sideNavLeftRender, sideNavRightRender, scroll, isLarge }: LayoutProps) => {
    return (
        <div>
                {
                    isLarge ?
                    <Grid w={"full"} h={"100vh"}>
                        <GridItem w={"full"} h={"full"} gridArea={"1/1/1/10"}> <Header isLarge={isLarge}/></GridItem>
                        <GridItem w={"full"} h={"full"} gridArea={"2/1/9/3"} overflowY={"hidden"}>
                            <aside>{ sideNavLeftRender? sideNavLeftRender({isLarge: isLarge}) : <Spacer />}</aside>
                        </GridItem>
                        <GridItem w={"full"} h={"full"} gridArea={"2/4/9/7"} overflowY={scroll? "auto": "hidden"}>
                            {children}
                        </GridItem>
                        <GridItem w={"full"} h={"full"} gridArea={"2/8/9/10"} overflowY={"hidden"}>
                            <aside>{ sideNavRightRender? sideNavRightRender({isLarge: isLarge}) : <Spacer /> }</aside>
                        </GridItem>
                        <GridItem w={"full"} h={"full"} gridArea={"10/1/10/10"}><Footer /></GridItem>
                    </Grid>
                    :<Grid w={"full"} h={"100vh"}>
                        <GridItem w={"full"} h={"full"} gridArea={"1/1/1/10"}> <Header isLarge={isLarge}/></GridItem>
                        <GridItem w={"full"} h={"full"} gridArea={"2/1/9/10"} padding={"md"} overflowY={scroll? "auto": "hidden"}>
                            {children}
                        </GridItem>
                        <GridItem w={"full"} h={"full"} gridArea={"10/1/10/10"}><Footer /></GridItem>
                    </Grid>

                }
        </div>
    )
}