import { Link } from "gatsby";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faBars, faHome, faTags, faAddressCard, faRss } from "@fortawesome/free-solid-svg-icons";
import { StaticImage } from "gatsby-plugin-image";
import { Grid, GridItem, HStack } from "@yamada-ui/layouts";
import { useColorMode } from "@yamada-ui/core";
import { Button, IconButton } from "@yamada-ui/button";
import { Menu, MenuButton, MenuItem, MenuList } from "@yamada-ui/menu";
import React from "react";
import DarkmodeToggle from "./DarkmodeToggle";
import SearchForm from "./search/Form";

interface HeaderProp {}

const Header = (prop: HeaderProp) => {
  const { colorMode } = useColorMode();

  return (
    <Grid templateRows={"subgrid"} templateColumns={"1fr 1fr"}>
      <GridItem
        w={"full"}
        h={"full"}
        justifySelf={"start"}
        className={`${colorMode === "dark" ? "invert" : ""}`}
      >
        <Link to="/" className={"btn btn-ghost no-animation whitespace-nowrap"}>
          <StaticImage
            src={"../../static/logo.png"}
            alt={"logo"}
            style={{ width: "65px", height: "65px" }}
            objectFit={"cover"}
          />
        </Link>
      </GridItem>
      <GridItem
        paddingTop={"lg"}
        w={"full"}
        h={"full"}
        justifySelf={"end"}
        className={"hidden lg:block"}
      >
        <HStack h={"full"} className={"justify-end align-center"}>
          <Button
            startIcon={<FontAwesomeIcon icon={faHome} />}
            variant="ghost"
            as={Link}
            to="/"
            className={"text-md font-bold"}
          >
            Home
          </Button>
          <Button
            startIcon={<FontAwesomeIcon icon={faTags} />}
            variant="ghost"
            as={Link}
            to="/tags"
            className={"text-md font-bold"}
          >
            Tags
          </Button>
          <Button
            startIcon={<FontAwesomeIcon icon={faAddressCard} />}
            variant="ghost"
            as={Link}
            to="/about"
            className={"text-md font-bold"}
          >
            About
          </Button>
          <Button
            startIcon={<FontAwesomeIcon icon={faRss} />}
            variant="ghost"
            as={Link}
            to="/feed/rss.xml"
            className={"text-md font-bold"}
          >
            RSS
          </Button>
          <DarkmodeToggle />
          <SearchForm />
        </HStack>
      </GridItem>
      <GridItem paddingTop={"md"} w={"full"} h={"full"} justifySelf={"end"} className={"lg:hidden"}>
        <HStack className={"justify-end"}>
          <SearchForm />
          <DarkmodeToggle />
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<FontAwesomeIcon icon={faBars} />}
              variant="ghost"
              className={"text-2xl font-bold"}
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
