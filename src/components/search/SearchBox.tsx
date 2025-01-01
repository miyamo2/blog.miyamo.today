import React from "react";
import { useSearchBox } from "react-instantsearch"
import { faSearch, faCancel } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { Input, InputGroup, InputLeftElement, InputRightElement } from "@yamada-ui/input";
import { IconButton } from "@yamada-ui/button";

export interface SearchBoxProps {}

const SearchBox = (props: SearchBoxProps) => {
  const { query, refine } = useSearchBox()

  return (
      <InputGroup className={"w-full"}>
        <InputLeftElement>
          <FontAwesomeIcon icon={faSearch} />
        </InputLeftElement>
        <Input value={query} placeholder={"search articles by algolia"} rounded="3xl" bg={["#ffffff", "#0d1117"]} onChange={(e) => {
          e.preventDefault()
          refine(e.target.value)
        }}
        />
        <InputRightElement w="4.5rem" clickable>
          <IconButton icon={<FontAwesomeIcon icon={faCancel} />} h="1.75rem" size="sm" onClick={() => {
            refine("")
          }} />
        </InputRightElement>
      </InputGroup>
  )
}

export default SearchBox