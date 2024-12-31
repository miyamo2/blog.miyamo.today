import React from "react"
import { useSearchBox } from "react-instantsearch"
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { FormControl } from "@yamada-ui/form-control";
import { Input } from "@yamada-ui/input";
import "./Search.css";

export interface SearchBoxProps {
  onFocus?:  React.FocusEventHandler<HTMLInputElement>
  onChange: (query: string) => void;
  hasFocus: boolean;
}

const SearchBox = ({ onFocus, onChange, hasFocus } : SearchBoxProps) => {
  const { query, refine } = useSearchBox()

  return (
    <FormControl className={"flex flex-row-reverse item-center mb-0"}>
        <Input
          className={hasFocus ? "border-auto" : "border-none"}
          type="text"
          placeholder="Search"
          aria-label="Search"
          onChange={e => {
            refine(e.target.value)
            onChange(e.target.value)
          }}
          value={query}
          onFocus={onFocus}
          style={{ outline: "none", fontSize: "1em", transition: "100ms", borderRadius: "2px" }}
        />
        <FontAwesomeIcon icon={faSearch} className={"w-[1em] m-[0.3em] pointer-events-none"} />
    </FormControl>
  )
}

export default SearchBox