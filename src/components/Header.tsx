import { Link } from "gatsby";
import {
  GridItem,
  Button,
  Menu,
  MenuButton,
  IconButton,
  MenuItem,
  MenuList,
  useBoolean,
  HStack,
  Grid,
} from "@yamada-ui/react";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faBars, faHome, faTags, faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { StaticImage } from "gatsby-plugin-image";
import React from "react";
import DarkmodeToggle from "./DarkmodeToggle";
import "./Header.css";

interface HeaderProp {
  logoPaddingLeft?: "md" | "2xl";
  menuPaddingRight?: "md" | "2xl";
}

const Header = ({ logoPaddingLeft, menuPaddingRight }: HeaderProp) => {
  const [isBargerOpen, { on, off }] = useBoolean();

  return (
    <Grid bg={["#f6f8fa", "#010409"]} templateRows={"subgrid"} templateColumns={"1fr 1fr"}>
      <GridItem
        w={"full"}
        h={"full"}
        paddingTop={"lg:md"}
        paddingLeft={logoPaddingLeft}
        justifySelf={"start"}
      >
          <Link
            to="/"
            className={"btn btn-ghost no-animation whitespace-nowrap"}
          >
            <StaticImage
              src={"../../static/logo.png"}
              alt={"logo"}
              style={{width: "65px", height: "65px"}}
              objectFit={"cover"}
              className={"logoimage"}/>
          </Link>
      </GridItem>
      <GridItem
        paddingTop={"lg"}
        w={"full"}
        h={"full"}
        justifySelf={"end"}
        className={"hidden lg:block"}
        paddingRight={menuPaddingRight}
      >
        <HStack className={"justify-end"}>
          <DarkmodeToggle />
          <Button
            startIcon={<FontAwesomeIcon icon={faHome} />}
            variant="ghost"
            as={Link}
            to="/"
            className={"text-lg font-bold"}
          >
            Home
          </Button>
          <Button
            startIcon={<FontAwesomeIcon icon={faTags} />}
            variant="ghost"
            as={Link}
            to="/tags"
            className={"text-lg font-bold"}
          >
            Tags
          </Button>
          <Button
            startIcon={<FontAwesomeIcon icon={faAddressCard} />}
            variant="ghost"
            as={Link}
            to="/about"
            className={"text-lg font-bold"}
          >
            About
          </Button>
        </HStack>
      </GridItem>
      <GridItem
        paddingTop={"md"}
        w={"full"}
        h={"full"}
        justifySelf={"end"}
        className={"lg:hidden"}
        paddingRight={menuPaddingRight}
      >
        <HStack className={"justify-end"}>
          <DarkmodeToggle />
          <Menu onOpen={on} onClose={off}>
            <MenuButton
              as={IconButton}
              icon={<FontAwesomeIcon icon={faBars} />}
              variant="ghost"
              className={"text-lg font-bold"}
              aria-label={"menu-button"}
            />
            <MenuList>
              <MenuItem icon={<FontAwesomeIcon icon={faHome} />}>
                <Link to="/">Home</Link>
              </MenuItem>
              <MenuItem icon={<FontAwesomeIcon icon={faTags} />}>
                <Link to="/tags">Tags</Link>
              </MenuItem>
              <MenuItem icon={<FontAwesomeIcon icon={faAddressCard} />}>
                <Link to="/about">About</Link>
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </GridItem>
    </Grid>
  );
};

export default Header;
