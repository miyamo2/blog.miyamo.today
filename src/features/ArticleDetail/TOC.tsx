import { Box } from "@yamada-ui/layouts";
import { Heading, Text } from "@yamada-ui/typography";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faListUl, faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { Accordion, AccordionItem, AccordionLabel, AccordionPanel } from "@yamada-ui/accordion";
import { AnchorLink } from "gatsby-plugin-anchor-links";

export interface ArticleTOCProps {
  isLarge: boolean;
  headings?: ReadonlyArray<{ readonly depth: number | null, readonly id: string | null, readonly value: string | null } | null> | null;
}

const ArticleTOC = ({isLarge, headings}: ArticleTOCProps) => {
  return (
    <>
      {isLarge ? (
        <Box w={"full"}>
          <Box bg={["#0d1117", "#f6f8fa"]} w={"full"} className={"backdrop-blur-md"} borderRadius={"md"}>
          <Heading as={"h2"} paddingBottom={"sm"} paddingTop={"sm"} color={["#f6f8fa", "#010409"]}>
            <FontAwesomeIcon icon={faListUl} paddingRight={"sm"} />
            TOC
          </Heading>
          </Box>
          <Box borderBottom={"solid"} writingMode={"horizontal-tb"} w={"full"}>
            <div className={"side-toc"}>
              {headings?.map((heading) => (
                <AnchorLink to={`#${heading?.id}`} key={heading?.id}>
                  <Text paddingBottom={"sm"} textIndent={`${heading?.depth ?? 0}em`}>{heading?.value}</Text>
                </AnchorLink>
              ))}
            </div>
          </Box>
        </Box>
      ) : (
          <Accordion toggle w={"full"} bg={["#0d1117", "#f6f8fa"]} borderRadius={"lg"}
            icon={({ expanded }) => {
              return <FontAwesomeIcon icon={expanded ? faMinus : faPlus} color={["#f6f8fa", "#010409"]} />
            }}>
            <AccordionItem w={"full"}>
              <AccordionLabel className={"text-lg font-bold"} color={["#f6f8fa", "#010409"]}>
                <FontAwesomeIcon icon={faListUl} paddingRight={"sm"} />
                TOC
              </AccordionLabel>
              <AccordionPanel bg={["#f6f8fa", "#0d1117"]}>
                {headings?.map((heading) => (
                  <AnchorLink to={`#${heading?.id}`} className={"pointer-events-auto"}>
                    <Text paddingBottom={"sm"} textIndent={`${heading?.depth ?? 0}em`}>{`${heading?.id}`}</Text>
                  </AnchorLink>
                ))}
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
      )}
    </>
  )
};

export default ArticleTOC;