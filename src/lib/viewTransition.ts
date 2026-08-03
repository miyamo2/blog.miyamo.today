/** view-transition-name must be a CSS custom-ident; article ids are ULIDs
 *  (alphanumeric) today, but sanitize defensively in case the API changes */
const sanitize = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "_");

/** shared-element pair: article card (list) <-> article detail grid */
export const articleCardTransition = (id: string): string =>
  `view-transition-name: article-card-${sanitize(id)}; view-transition-class: article-card-morph;`;

/** shared-element pair: card thumbnail (list) <-> hero image (detail) */
export const articleHeroTransition = (id: string): string =>
  `view-transition-name: article-hero-${sanitize(id)}; view-transition-class: article-hero-morph;`;
