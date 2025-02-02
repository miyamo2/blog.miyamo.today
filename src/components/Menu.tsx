import { useDisclosure } from "@yamada-ui/use-disclosure";
import { useBuyMeACoffee } from "../hooks/useBuyMeACoffee";
import { IconButton, Button } from "@yamada-ui/button";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faBars, faAddressCard, faHome, faListUl, faTags } from "@fortawesome/free-solid-svg-icons";
import { Modal, ModalBody, ModalHeader } from "@yamada-ui/modal";
import { Heading } from "@yamada-ui/typography";
import { VStack } from "@yamada-ui/layouts";
import * as React from "react";
import { Link } from "gatsby";

export const MenuModal = () => {
  const { open, onOpen, onClose } = useDisclosure();
  const { setVisibility } = useBuyMeACoffee();

  return (
    <>
      <IconButton
        onClick={() => {
          onOpen();
          setVisibility(false);
        }}
        icon={<FontAwesomeIcon icon={faBars} />}
        variant="ghost"
        className={"text-2xl font-bold"}
        aria-label={"menu-button"}
      />
      <Modal
        id={"toc-modal"}
        open={open}
        onClose={() => {
          onClose();
          setVisibility(true);
        }}
        duration={0.4}
        placement={"bottom"}
        size={"full"}
        className={"lg:hidden"}
      >
        <ModalHeader id={"menu-modal-header"}>
          <Heading size={"lg"} className={"font-bold"}>
            Menu
          </Heading>
        </ModalHeader>
        <ModalBody id={"menu-modal-body scrollable-y"}>
          <VStack h={"full"}>
            <Button
              startIcon={<FontAwesomeIcon icon={faHome} />}
              variant="ghost"
              as={Link}
              to="/"
              onClick={() => {
                onClose();
                setVisibility(true);
              }}
              className={"text-lg font-bold"}
            >
              Home
            </Button>
            <Button
              startIcon={<FontAwesomeIcon icon={faTags} />}
              variant="ghost"
              as={Link}
              to="/tags"
              onClick={() => {
                onClose();
                setVisibility(true);
              }}
              className={"text-lg font-bold"}
            >
              Tags
            </Button>
            <Button
              startIcon={<FontAwesomeIcon icon={faAddressCard} />}
              variant="ghost"
              as={Link}
              to="/about"
              onClick={() => {
                onClose();
                setVisibility(true);
              }}
              className={"text-lg font-bold"}
            >
              About
            </Button>
          </VStack>
        </ModalBody>
      </Modal>
    </>
  );
};
