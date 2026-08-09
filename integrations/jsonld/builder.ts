import type { BreadcrumbList, ItemList, Person, Thing, WebSite, WithContext } from "schema-dts";
import { jsonLdConfig } from "virtual:jsonld/config";

/** every schema.org type name known to schema-dts (e.g. "WebSite", "ItemList") */
type SchemaType = Exclude<Thing, string>["@type"];

/** a JSON-LD node; kept loose because the builder assembles it dynamically */
export type JSONLD = Record<string, unknown> & { "@type": SchemaType };

/**
 * Absolute URL for a site-relative path. siteUrl carries no trailing slash, so
 * a path without a leading one would otherwise be glued onto the host
 * ("articles/x" -> "https://blog.miyamo.todayarticles/x").
 *
 * Paths that are already absolute are returned untouched: article images are
 * remote in the source data and only become site-relative once astro:assets has
 * processed them, so both forms reach `image`.
 */
const absoluteUrl = (path?: string): string => {
  if (!path) {
    return `${jsonLdConfig.siteUrl}/`;
  }
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(path)) {
    return path;
  }
  return `${jsonLdConfig.siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
};

/**
 * JSON for a `<script type="application/ld+json">` body.
 *
 * `JSON.stringify` on its own is not safe there: the HTML parser ends the
 * element at the first `</script` in the text regardless of what JSON thinks,
 * so an article title or excerpt containing one closes the tag early and the
 * rest of the payload is parsed as markup. Escaping `<`, `>` and `&` to their
 * \u form leaves the decoded string identical while making the sequence
 * unrepresentable in the source. (Same fix react-schemaorg and
 * astro-seo-schema ship; it is the only thing those packages do that this
 * repository's own serialization did not.)
 */
export const serializeJSONLD = (node: unknown): string =>
  JSON.stringify(node).replace(
    /[<>&]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
  );

/**
 * The author and publisher nodes repeat on every page that credits them, and
 * a consumer has no way to tell those copies are one entity unless they share
 * an `@id`. These fragments are derived rather than configured so they stay
 * put when the display name changes -- an `@id` that moves is a new entity.
 */
const authorId = (): string => `${absoluteUrl(jsonLdConfig.author?.path)}#person`;
const publisherId = (): string => `${absoluteUrl(jsonLdConfig.publisher?.path)}#organization`;
/**
 * The site as an entity, which is not the same thing as its home page -- that
 * page has its own node and its own `@id` (the site root, unfragmented). Two
 * different things must not claim one IRI, hence the fragment.
 */
const websiteId = (): string => `${absoluteUrl()}#website`;

/**
 * @param subject whether the person *is* what the node is about (a
 * ProfilePage's `mainEntity`) rather than a credit on someone else's node.
 * Only then do the describing fields belong here; repeating them on every
 * article would say the same thing once per page.
 */
const authorNode = (subject = false): Record<string, unknown> | undefined => {
  const author = jsonLdConfig.author;
  if (!author) {
    return undefined;
  }
  return {
    "@type": "Person",
    "@id": authorId(),
    name: author.name,
    ...(author.path ? { url: absoluteUrl(author.path) } : {}),
    ...(author.sameAs?.length ? { sameAs: author.sameAs } : {}),
    ...(subject
      ? {
          ...(author.alternateName?.length ? { alternateName: author.alternateName } : {}),
          ...(author.disambiguatingDescription
            ? { disambiguatingDescription: author.disambiguatingDescription }
            : {}),
          ...(author.jobTitle ? { jobTitle: author.jobTitle } : {}),
        }
      : {}),
  };
};

/**
 * The full Person, for the `mainEntity` of the page that is about them. This
 * is the one place the entity is defined rather than merely referenced.
 */
export const buildPersonJSONLD = (): Person | undefined =>
  authorNode(true) as unknown as Person | undefined;

const publisherNode = (): Record<string, unknown> | undefined => {
  const publisher = jsonLdConfig.publisher;
  if (!publisher) {
    return undefined;
  }
  const logo = publisher.logo;
  return {
    "@type": "Organization",
    "@id": publisherId(),
    name: publisher.name,
    ...(publisher.path ? { url: absoluteUrl(publisher.path) } : {}),
    ...(logo
      ? {
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl(logo.path),
            ...(logo.width ? { width: logo.width } : {}),
            ...(logo.height ? { height: logo.height } : {}),
          },
        }
      : {}),
  };
};

interface BuildJSONLDParams {
  path?: string;
  type?: SchemaType;
  /** the node's own `name` (a page title, a tag); `withSiteName` overrides it */
  name?: string;
  headline?: string;
  description?: string;
  image?: string;
  attributes?: Record<string, unknown>;
  withSiteName?: boolean;
  withMainEntityOfPage?: boolean;
  withUrl?: boolean;
  withContext?: boolean;
  withAuthor?: boolean;
  withPublisher?: boolean;
  withID?: boolean;
  /**
   * Link the node to the WebSite it belongs to. A bare `@id` reference is
   * enough because BaseHead puts the WebSite node on every page, so the
   * target is always in the same document as the reference.
   */
  withIsPartOf?: boolean;
}

// port of src/hooks/useJSONLD.tsx (no React hooks needed anymore)
export const buildJSONLD = ({
  path,
  type,
  name,
  headline,
  description,
  image,
  attributes,
  withSiteName,
  withMainEntityOfPage,
  withUrl,
  withContext,
  withAuthor,
  withPublisher,
  withID,
  withIsPartOf,
}: BuildJSONLDParams): JSONLD => {
  const jsonLD: JSONLD = {
    "@type": type ?? "WebSite",
    ...attributes,
  };
  if (withContext) {
    jsonLD["@context"] = "https://schema.org";
  }
  if (withID) {
    jsonLD["@id"] = absoluteUrl(path);
  }
  if (headline) {
    jsonLD["headline"] = headline;
  }
  if (withSiteName) {
    jsonLD["name"] = jsonLdConfig.name;
  } else if (name) {
    jsonLD["name"] = name;
  }
  if (description) {
    jsonLD["description"] = description;
  }
  if (withMainEntityOfPage) {
    // always a WebPage: mainEntityOfPage points at the *page* the node is the
    // main entity of, not at another copy of the node's own type
    jsonLD["mainEntityOfPage"] = {
      "@type": "WebPage",
      "@id": absoluteUrl(path),
    };
  }
  if (withUrl) {
    jsonLD["url"] = absoluteUrl(path);
  }
  if (withIsPartOf) {
    jsonLD["isPartOf"] = { "@id": websiteId() };
  }
  if (image) {
    jsonLD["image"] = {
      "@type": "ImageObject",
      url: absoluteUrl(image),
    };
  }
  if (withAuthor) {
    const author = authorNode();
    if (author) {
      jsonLD["author"] = author;
    }
  }
  if (withPublisher) {
    const publisher = publisherNode();
    if (publisher) {
      jsonLD["publisher"] = publisher;
    }
  }
  return jsonLD;
};

export const buildWebSiteJSONLD = (): WithContext<WebSite> => {
  return buildJSONLD({
    type: "WebSite",
    withContext: true,
    withUrl: true,
    withSiteName: true,
    withPublisher: true,
    attributes: {
      "@id": websiteId(),
      ...(jsonLdConfig.alternateName ? { alternateName: jsonLdConfig.alternateName } : {}),
    },
  }) as unknown as WithContext<WebSite>;
};

/**
 * The nodes every page carries. BaseHead.astro prepends these to whatever the
 * page passed, so a page never restates the site's own identity.
 */
export const globalJSONLD = (): JSONLD[] => [buildWebSiteJSONLD() as unknown as JSONLD];

export interface ListEntry {
  name?: string;
  path: string;
}

/**
 * An ItemList to hang off a CollectionPage's `mainEntity`. Left without
 * `@context` on purpose -- it is always nested inside a node that has one.
 */
export const buildItemList = (entries: ListEntry[]): ItemList => {
  return {
    "@type": "ItemList",
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(entry.path),
      ...(entry.name ? { name: entry.name } : {}),
    })),
  } as unknown as ItemList;
};

export interface BreadcrumbEntry {
  name: string;
  path: string;
}

/**
 * A BreadcrumbList for the trail below the site root; the root crumb is
 * prepended here so no caller has to repeat it. Pages that *are* the root have
 * nothing to describe and should not emit one at all.
 */
export const buildBreadcrumbJSONLD = (trail: BreadcrumbEntry[]): WithContext<BreadcrumbList> => {
  const crumbs: BreadcrumbEntry[] = [{ name: jsonLdConfig.name, path: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  } as unknown as WithContext<BreadcrumbList>;
};
