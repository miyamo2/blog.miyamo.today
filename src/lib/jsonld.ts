import { refOrganization, refPerson } from "virtual:jsonld";

/**
 * `author` and `publisher` as bare `@id` references, for a page node to spread
 * into its builder options.
 *
 * `<JsonLd />` puts the full Person on every page (the integration's
 * `siteNodes.author`) and `graph: true` keeps it in the same document, so a
 * reference resolves to it and the eleven `sameAs` urls are stated once.
 *
 * `refOrganization()` returns the same `@id` as `refPerson()` here: the
 * integration is configured with `publisher: "author"`, so both credits name
 * one entity.
 *
 * Spread it *before* the builder's own options -- it occupies `properties`.
 */
export const credits = {
  author: false as const,
  publisher: false as const,
  properties: { author: refPerson(), publisher: refOrganization() },
};
