declare module "virtual:font-subset" {
  /**
   * The site's @font-face rules, ready to inline into a page head.
   *
   * Built by integrations/font-subset, which also writes the files they point
   * at -- the subsets' names carry a digest of the characters in them, so this
   * is the only place that can name them correctly.
   */
  const fontFaceCss: string;
  export default fontFaceCss;
}
