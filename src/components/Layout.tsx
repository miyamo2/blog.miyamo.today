import React from "react";
import { ReactNode } from "react"
import {Header} from "@/components/Header";
import {Footer} from "@/components/Footer";
import {Grid, GridItem, Spacer} from "@yamada-ui/react"

interface LayoutProps {
    children: ReactNode;
    scroll?: boolean;
};

export const Layout = ({ children, scroll }: LayoutProps) => {
    return (
        <div>
            <Grid
                w={"full"}
                h={"100vh"}
            >
                <GridItem w={"full"} h={"full"} gridArea={"1/1/1/10"}> <Header /></GridItem>
                <GridItem w={"full"} h={"full"} gridArea={"2/1/9/2"} overflowY={"hidden"}><Spacer/></GridItem>
                <GridItem w={"full"} h={"full"} gridArea={"2/3/9/8"} overflowY={scroll? "auto": "hidden"}>
                    {children}
                </GridItem>
                <GridItem w={"full"} h={"full"} gridArea={"2/9/9/10"} overflowY={"hidden"}><Spacer/></GridItem>
                <GridItem w={"full"} h={"full"} gridArea={"10/1/10/10"}><Footer /></GridItem>
            </Grid>
        </div>
    )
}