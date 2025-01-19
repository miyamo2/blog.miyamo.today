export const useBuyMeACoffee = () => {
  const buyMeACoffeeWidget = document.getElementById("bmc-wbtn");

  return {
    setVisibility: (visibility: boolean) => {
      if (buyMeACoffeeWidget === null) {
        return
      }
      buyMeACoffeeWidget.hidden = !visibility
      return
    },
    toggleVisibility: () => {
      if (buyMeACoffeeWidget === null) {
        return
      }
      buyMeACoffeeWidget.hidden = !buyMeACoffeeWidget.hidden
      return
    }
  }
}