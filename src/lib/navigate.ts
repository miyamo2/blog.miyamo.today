/** drop-in replacement for gatsby's navigate() (full page navigation) */
export const navigate = (to: string | number): void => {
  if (typeof window === "undefined") {
    return;
  }
  if (typeof to === "number") {
    window.history.go(to);
    return;
  }
  window.location.assign(to);
};
