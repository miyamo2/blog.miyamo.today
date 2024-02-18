import React from "react";
import { ReactNode } from "react"
import {Header} from "./Header";
import {Footer} from "./Footer";

interface LayoutProps {
    children: ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
    return (
        <div>
            <Header />
            <div className={"container mx-auto my-4 px-4"}>
                {children}
            </div>
            <Footer />
        </div>
    )
}