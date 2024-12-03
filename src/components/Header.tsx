import React, { useMemo } from "react";
import { Link } from "gatsby";
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
  HStack,
} from "@yamada-ui/react";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faBars, faXmark, faHome, faTags, faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { useStaticLogoImage } from "../hooks/useStaticLogoImage";
import { useSiteMetaData } from "../hooks/useSiteMetaData";
import { Image } from "../components/Image";

interface HeaderProp {
  isLarge: boolean;
  logoPaddingLeft?: "md" | "2xl";
  bargerPaddingRight?: "md" | "2xl";
}

export const Header = ({ isLarge, logoPaddingLeft }: HeaderProp) => {
  const siteMeta = useMemo(() => useSiteMetaData(), []);
  const iconPath = siteMeta?.icon ? siteMeta.icon.replace("/", "") : "";

  const allFileConnection = useStaticLogoImage(iconPath);
  const [isBargerOpen, { on, off }] = useBoolean();

  return (
    <>
      <GridItem
        w={"full"}
        h={"full"}
        gridArea={"1/2/2/2"}
        paddingTop={"md"}
        paddingLeft={logoPaddingLeft}
      >
        <Link
          to="/"
          className={"btn btn-ghost text-black text-4xl font-bold no-animation whitespace-nowrap"}
        >
          <Image allFileConnectrion={allFileConnection} objectFit={"cover"} />
        </Link>
      </GridItem>
      <GridItem
        paddingTop={isLarge ? "lg" : "md"}
        w={"full"}
        h={"full"}
        gridArea={"1/8/2/8"}
        justifySelf={"end"}
      >
        {isLarge ? (
          <HStack className={"text-right"} w={"fit-content"}>
            <Button
              startIcon={<FontAwesomeIcon icon={faHome} />}
              variant="ghost"
              as={Link}
              to="/"
              className={"text-black text-lg font-bold"}
            >
              Home
            </Button>
            <Button
              startIcon={<FontAwesomeIcon icon={faTags} />}
              variant="ghost"
              as={Link}
              to="/tags"
              className={"text-black text-lg font-bold"}
            >
              Tags
            </Button>
            <Button
              startIcon={<FontAwesomeIcon icon={faAddressCard} />}
              variant="ghost"
              as={Link}
              to="/about"
              className={"text-black text-lg font-bold"}
            >
              About
            </Button>
          </HStack>
        ) : (
          <Menu onOpen={on} onClose={off}>
            <MenuButton
              as={IconButton}
              icon={
                isBargerOpen ? (
                  <FontAwesomeIcon icon={faXmark} />
                ) : (
                  <FontAwesomeIcon icon={faBars} />
                )
              }
              variant="ghost"
              className={"text-black text-lg font-bold"}
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
        )}
      </GridItem>
    </>
  );
};
