/**
 * Types for the virtual module the `jsonld` integration serves. Kept as an
 * ambient declaration (no top-level import/export) so it applies globally;
 * `integrations/**` is already in tsconfig's `include`.
 */
declare module "virtual:jsonld/config" {
  export const jsonLdConfig: import("./config").JsonLdConfig;
}
