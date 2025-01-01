import React from "react";
import { useDisclosure } from "@yamada-ui/use-disclosure";
import { Button } from "@yamada-ui/button";
import { Text } from "@yamada-ui/typography";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { Box, HStack } from "@yamada-ui/layouts";
import SearchModal from "./Modal";

const SearchForm= () => {
  const { open, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Box>
        <HStack
          as={Button}
          type="button"
          bg={["#ffffff", "#0d1117"]}
          border="1px solid"
          gap="sm"
          outline="0"
          px="3"
          rounded="3xl"
          transitionDuration="slower"
          transitionProperty="common"
          w="4em"
          _focusVisible={{ shadow: "outline" }}
          onClick={onOpen}
          className={"text-sm lg:text-md font-bold"}
        >
          <FontAwesomeIcon icon={faSearch} />
          <Text flex="1"></Text>
        </HStack>
      </Box>
      <SearchModal open={open} onClose={onClose} />
    </>
  );
}

export default SearchForm;