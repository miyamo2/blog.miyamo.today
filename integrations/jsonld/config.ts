/**
 * The contract between the `jsonld` integration and the builders that run
 * while pages render.
 *
 * `remote-image-staging` passes its handful of strings through process.env
 * because the integration and the render-time code live in separate module
 * graphs. That does not scale to the nested shape below, so this one travels
 * as a Vite virtual module instead: the integration serializes the resolved
 * config into `virtual:jsonld/config` at `astro:config:setup` and the builder
 * imports it like any other module (see ./virtual.d.ts for its types).
 */

/** an image the site serves itself, addressed by a site-relative path */
export interface JsonLdImage {
  path: string;
  width?: number;
  height?: number;
}

/**
 * The person credited as `author` on every node that asks for one.
 *
 * The fields below `sameAs` describe the person rather than credit them, so
 * they are only emitted where the person *is* the subject -- the ProfilePage's
 * `mainEntity`. Everywhere else the node carries `@id` / `name` / `url` /
 * `sameAs`, and the shared `@id` is what tells a consumer the two are one
 * entity.
 */
export interface JsonLdAuthor {
  name: string;
  /** site-relative path of the author's own page */
  path?: string;
  /** profiles that are the same entity as the author (schema.org `sameAs`) */
  sameAs?: string[];
  /** real alternate handles only; repeating `name` here says nothing */
  alternateName?: string[];
  /**
   * What tells this person apart from a similarly named one. Write it as a
   * positive description: "is not <other person>" reads as a distinction to a
   * human, but no consumer models negation, and naming the other party only
   * puts the two handles in the same sentence.
   */
  disambiguatingDescription?: string;
  jobTitle?: string;
}

/**
 * The organization credited as `publisher`.
 *
 * `logo` belongs here and nowhere else: schema.org defines it on Organization
 * and Brand only, so a `logo` hung directly off a WebSite / BlogPosting /
 * CollectionPage is invalid and a parser that follows the type definitions
 * drops it. Nesting it under `publisher` is also the shape Google documents
 * for article structured data.
 */
export interface JsonLdPublisher {
  name: string;
  path?: string;
  logo?: JsonLdImage;
}

export interface JsonLdOptions {
  /** the WebSite node's `name`, and the first crumb of every BreadcrumbList */
  name: string;
  alternateName?: string;
  author?: JsonLdAuthor;
  publisher?: JsonLdPublisher;
  /** origin every absolute url is built from; defaults to astro's own `site` */
  siteUrl?: string;
}

/** JsonLdOptions after the integration has filled in the defaults */
export interface JsonLdConfig extends JsonLdOptions {
  /** always set, and never carries a trailing slash */
  siteUrl: string;
}

export const JSONLD_CONFIG_MODULE_ID = "virtual:jsonld/config";
