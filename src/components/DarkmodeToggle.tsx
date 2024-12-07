import React from 'react'
import { useColorMode } from "@yamada-ui/core";
import { Switch } from "@yamada-ui/switch"
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

const DarkmodeToggle = () => {
  const { colorMode, toggleColorMode } = useColorMode()
  return (
    <Switch isChecked={colorMode === "dark"}
            onChange={() => toggleColorMode()}
            aria-label={"toggle-dark-mode"}>
      {colorMode === "light" ? <FontAwesomeIcon icon={faMoon} /> : <FontAwesomeIcon icon={faSun} />}
    </Switch>
  )
}

export default DarkmodeToggle