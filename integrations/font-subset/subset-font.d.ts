// subset-font ships no types of its own. Only the call this integration makes
// is described here -- see its README for the rest of the options.
declare module "subset-font" {
  export default function subsetFont(
    font: Buffer,
    text: string,
    options?: { targetFormat?: "sfnt" | "woff" | "woff2" }
  ): Promise<Buffer>;
}
