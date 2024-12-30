import { Box } from "@yamada-ui/layouts";
import { Heading, Text } from "@yamada-ui/typography";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faListUl, faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { useState } from "react";
import { Accordion, AccordionItem, AccordionLabel, AccordionPanel, AccordionProps } from "@yamada-ui/accordion";
import { AnchorLink } from "gatsby-plugin-anchor-links";

export interface ArticleTOCProps {
  headings?: ReadonlyArray<{ readonly depth: number | null, readonly id: string | null, readonly value: string | null } | null> | null;
}

export const ArticleTOCMedium = ({headings}: ArticleTOCProps) => {
  const [index, setIndex] = useState<AccordionProps["index"]>(-1)

  return (
    <Accordion toggle={true} w={"full"}bg={["#0d1117", "#f6f8fa"]} borderRadius={"lg"} index={index} onChange={setIndex}
      icon={({ expanded }) => {
        return <FontAwesomeIcon icon={expanded ? faMinus : faPlus} color={["#f6f8fa", "#010409"]} />
      }}>
      <AccordionItem w={"full"}>
        <AccordionLabel color={["#f6f8fa", "#010409"]}>
          <FontAwesomeIcon icon={faListUl} paddingRight={"sm"} />
          Table of Contents
        </AccordionLabel>
        <AccordionPanel bg={["#f6f8fa", "#0d1117"]} h={"100vh"}>
          <Box className={"side-toc"} w={"full"}>
            {headings?.map((heading) => (
                <AnchorLink to={`#${heading?.id}`} className={"pointer-events-auto"} onAnchorLinkClick={() => setIndex(-1)}>
                  <Text paddingBottom={"sm"} textIndent={`${calcDepth(heading?.depth)}em`}>{`${heading?.id}`}</Text>
                </AnchorLink>
              ))}
          </Box>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
};

export const ArticleTOCLarge = ({headings}: ArticleTOCProps) => {
  return (
    <Box w={"full"}>
      <Box w={"full"} className={"backdrop-blur-md"} borderBottom={"solid"} writingMode={"horizontal-tb"} >
        <Heading as={"h2"} paddingTop={"sm"} size={"md"} className={"font-bold"} whiteSpace={"nowrap"}>
          <FontAwesomeIcon icon={faListUl} paddingRight={"sm"} />
          Table of Contents
        </Heading>
      </Box>
      <Box className={"side-toc"} w={"full"} paddingTop={"sm"}>
        {headings?.map((heading) => (
          <AnchorLink to={`#${heading?.id}`} key={heading?.id}>
            <Text textOverflow={"ellipsis"} paddingBottom={"sm"} textIndent={`${calcDepth(heading?.depth)}em`}>{heading?.value}</Text>
          </AnchorLink>
        ))}
      </Box>
    </Box>
  )
};

const calcDepth = (depth: number | null | undefined) => {
  if (!depth) {
    return 0
  }
  return depth - 1
}