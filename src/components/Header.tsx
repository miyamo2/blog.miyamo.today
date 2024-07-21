import React from 'react';
import { Link } from 'gatsby';
import {
    Grid,
    GridItem,
    Button,
    Menu,
    MenuButton,
    IconButton,
    MenuItem,
    MenuList,
    useBoolean,
    Divider
} from "@yamada-ui/react";
import { Icon as FontAwesomeIcon } from "@yamada-ui/fontawesome"
import { faBars, faXmark, faHome, faTags, faAddressCard } from "@fortawesome/free-solid-svg-icons"

interface HeaderProp {
    isLarge: boolean;
}

export const Header = ({isLarge}: HeaderProp) => {
    const [isBargerOpen, { on, off }] = useBoolean()
    return (<header>
        <Grid templateColumns="repeat(9, 1fr)" backdropFilter="blur(10px)">
            <GridItem colSpan={3} w="full" padding={"md"}>
                <Link to="/" className={"btn btn-ghost text-black text-4xl font-bold no-animation whitespace-nowrap"}>blog.miyamo.today</Link>
            </GridItem>
            <GridItem w="full" colStart={7} paddingTop={"lg"} paddingBottom={"md"}>
                { isLarge ? <Button leftIcon={<FontAwesomeIcon icon={faHome}/>} variant="ghost" as={Link} to="/" className={"text-black text-lg font-bold"}>Home</Button>: <></>}
            </GridItem>
            <GridItem w="full" colStart={8} paddingTop={"lg"} paddingBottom={"md"}>
                { isLarge ? <Button leftIcon={<FontAwesomeIcon icon={faTags}/>} variant="ghost" as={Link} to="/tags" className={"text-black text-lg font-bold"}>Tags</Button>: <></>}
            </GridItem>
            <GridItem w="full" colStart={9} paddingTop={isLarge ? "lg" : "md"} paddingBottom={"md"} >
                { isLarge ? <Button leftIcon={<FontAwesomeIcon icon={faAddressCard}/>} variant="ghost" as={Link} to="/about" className={"text-black text-lg font-bold"}>About</Button>:
                    <Menu onOpen={on} onClose={off}>
                        <MenuButton
                            as={IconButton}
                            icon={isBargerOpen? <FontAwesomeIcon icon={faXmark}/> : <FontAwesomeIcon icon={faBars}/>}
                            variant="ghost"
                        />
                        <MenuList>
                            <MenuItem icon={<FontAwesomeIcon icon={faHome}/>}>
                                <Link to="/">Home</Link>
                            </MenuItem>
                            <MenuItem  icon={<FontAwesomeIcon icon={faTags}/>}>
                                <Link to="/tags">Tags</Link>
                            </MenuItem>
                            <MenuItem icon={<FontAwesomeIcon icon={faAddressCard}/>}>
                                <Link to="/about">About</Link>
                            </MenuItem>
                        </MenuList>
                    </Menu>
                }
            </GridItem>
        </Grid>
        <Divider/>
    </header>)
}