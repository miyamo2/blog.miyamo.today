import { RefObject, useEffect } from "react";

const events = [`mousedown`, `touchstart`]


const useClickOutside = (ref: RefObject<any>, onClickOutside: () => void) => {
  const isOutside = (element: any) => !ref.current || !ref.current.contains(element)

  const onClick = (event: { target: any }) => {
    if (isOutside(event.target)) {
      onClickOutside()
    }
  }

  useEffect(() => {
    for (const event of events) {
      document.addEventListener(event, onClick)
    }
    return () => {
      for (const event of events) document.removeEventListener(event, onClick)
    }
  })
}

export default useClickOutside