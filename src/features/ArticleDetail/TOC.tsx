import { Box } from "@yamada-ui/layouts";
import { Heading, Text } from "@yamada-ui/typography";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faListUl } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { AnchorLink } from "gatsby-plugin-anchor-links";
import { useDisclosure } from "@yamada-ui/use-disclosure";
import { Button } from "@yamada-ui/button";
import { Modal, ModalBody, ModalHeader } from "@yamada-ui/modal";
import "./TOC.css";
import { useBuyMeACoffee } from "../../hooks/useBuyMeACoffee";

export interface ArticleTOCProps {
  headings?: ReadonlyArray<{
    readonly depth: number | null;
    readonly id: string | null;
    readonly value: string | null;
  } | null> | null;
}

export const ArticleTOCModal = ({ headings }: ArticleTOCProps) => {
  const { open, onOpen, onClose } = useDisclosure();
  const { setVisibility } = useBuyMeACoffee();

  return (
    <>
      <div className={"toc-modal-button-wrapper lg:hidden"}>
        <Button
          onClick={() => {
            onOpen();
            setVisibility(false);
          }}
          borderRadius={"32px"}
          h={"64px"}
          w={"64px"}
          display={open ? "none" : "inline-flex"}
          bg={"#186bf2"}
        >
          <FontAwesomeIcon icon={faListUl} h={"36px"} w={"36px"} />
        </Button>
      </div>
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
        <ModalHeader id={"toc-modal-header"}>
          <Heading size={"lg"} className={"font-bold"}>
            Table of Contents
          </Heading>
        </ModalHeader>
        <ModalBody id={"toc-modal-body"}>
          <Box w={"full"}>
            {headings?.map((heading) => (
              <AnchorLink
                to={`#${heading?.id}`}
                key={heading?.id}
                className={"pointer-events-auto"}
                onAnchorLinkClick={() => {
                  onClose();
                  setVisibility(true);
                }}
              >
                <Text
                  whiteSpace={"nowrap"}
                  overflow={"hidden"}
                  textOverflow={"ellipsis"}
                  width={"full"}
                  paddingBottom={"sm"}
                  textIndent={`${calcDepth(heading?.depth)}em`}
                >
                  {heading?.value}
                </Text>
              </AnchorLink>
            ))}
          </Box>
        </ModalBody>
      </Modal>
    </>
  );
};

export const ArticleTOCLarge = ({ headings }: ArticleTOCProps) => {
  return (
    <Box w={"full"} paddingLeft={"0.5em"}>
      <Box
        w={"full"}
        className={"backdrop-blur-md"}
        borderBottom={"solid"}
        writingMode={"horizontal-tb"}
      >
        <Heading as={"h2"} size={"md"} className={"font-bold"} whiteSpace={"nowrap"}>
          <FontAwesomeIcon icon={faListUl} paddingRight={"sm"} />
          Table of Contents
        </Heading>
      </Box>
      <Box className={"side-toc"} w={"full"} paddingTop={"sm"}>
        {headings?.map((heading) => (
          <AnchorLink to={`#${heading?.id}`} key={heading?.id}>
            <Text
              whiteSpace={"nowrap"}
              overflow={"hidden"}
              textOverflow={"ellipsis"}
              width={"full"}
              paddingBottom={"sm"}
              textIndent={`${calcDepth(heading?.depth)}em`}
            >
              {heading?.value}
            </Text>
          </AnchorLink>
        ))}
      </Box>
    </Box>
  );
};

const calcDepth = (depth: number | null | undefined) => {
  if (!depth) {
    return 0;
  }
  return depth - 1;
};
