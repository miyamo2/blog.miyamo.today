export const useBuyMeACoffee = () => {
  if (typeof window === "undefined") {
    return {
      setVisibility: (visibility: boolean) => {},
      toggleVisibility: () => {},
    };
  }

  const buyMeACoffeeWidget = document.getElementById("bmc-wbtn");

  return {
    setVisibility: (visibility: boolean) => {
      if (buyMeACoffeeWidget === null) {
        return;
      }
      buyMeACoffeeWidget.hidden = !visibility;
      return;
    },
    toggleVisibility: () => {
      if (buyMeACoffeeWidget === null) {
        return;
      }
      buyMeACoffeeWidget.hidden = !buyMeACoffeeWidget.hidden;
      return;
    },
  };
};
