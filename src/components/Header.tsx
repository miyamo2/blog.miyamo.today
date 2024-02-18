import React from 'react';
import type { FC } from 'react';
import { Link } from 'gatsby';
import { Navbar } from 'react-daisyui'

export const Header: FC = () => (
    <header>
        <div className={"navbar sticky top-0 z-50 bg-base-100"}>
            <div className={"flex-1"}>
                <Link to="/" className={"btn btn-ghost text-black text-xl md:text-2xl lg:text-3xl font-bold no-animation"}>miyamo2/blog</Link>
            </div>
            <div className={"flex-none"}>
                <div className={"dropdown dropdown-end inline lg:hidden"}>
                    <div>
                        <div tabIndex={0} role="button" className={"btn btn-square btn-ghost"}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                 className={"w-5 h-5 stroke-current"}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </div>
                    </div>
                    <ul tabIndex={0}
                        className={"menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"}>
                        <Link to="/" className={"tab"} activeClassName={"tab-active"}>Home</Link>
                        <Link to="/tags" className={"tab"} activeClassName={"tab-active"}>Tags</Link>
                        <Link to="/about" className={"tab"} activeClassName={"tab-active"}>About</Link>
                    </ul>
                </div>
                <div role="tablist" className={"hidden lg:inline tabs"}>
                    <Link to="/" role="tab" activeClassName={"tab-active"} className={"tab text-lg"}>Home</Link>
                    <Link to="/tags" role="tab" activeClassName={"tab-active"} className={"tab text-lg"}>Tags</Link>
                    <Link to="/about" role="tab" activeClassName={"tab-active"} className={"tab text-lg"}>About</Link>
                </div>
            </div>
        </div>
    </header>
);