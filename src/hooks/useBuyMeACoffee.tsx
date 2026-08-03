export const useBuyMeACoffee = () => {
  if (typeof window === "undefined") {
    return {
      setVisibility: (visibility: boolean) => {},
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
  };
};
