/* THE PRODUCT'S NAME — one place. Since 13 November (Rowland): "I'd like to reverse the product branding back to Faultline. Luna remains
 * the name of the AI assistant and intelligence behind the product. The application itself is Faultline." So PRODUCT is Faultline — "The
 * Operational Improvement System", by Opex Elevate (the brand of 31 October) — and COLLEAGUE is Luna, the AI colleague and intelligence
 * within it; two names, never used for one another. (History: LUNA was the product's name 11 November, LUNAR 11–13 November —
 * docs/LUNA-BRAND.md, docs/BRAND.md.)
 *
 * Every word a customer reads that names the product reads from here: the top bar, the landing page, the install sheet, the update
 * banner, a paper's foot, a file's name. Internal identifiers — storage keys (`faultline.*`), the database's objects, CSS classes, the
 * domain, the font files — were never renamed and stay as they are. */
export const PRODUCT = {
  /** The name, as written in a sentence. */
  name: 'Faultline',
  /** The name as the wordmark sets it. */
  mark: 'Faultline',
  /** The line under the name. */
  line: 'The Operational Improvement System',
  /** The statement. */
  statement: 'With Luna, your AI colleague, at its centre — from the factory floor to the boardroom',
  /** The maker. */
  parent: 'Opex Elevate',
  /** The address. */
  domain: 'faultline.opexelevate.co.uk',
} as const;

/** The AI colleague and intelligence within Faultline — never the product's name. */
export const COLLEAGUE = { name: 'Luna', mark: 'LUNA' } as const;

/** A file's name, made by the product: "LUNAR-export-2026-11-11.xlsx". */
export const productFile = (what: string, ext: string): string => `${PRODUCT.name}-${what}.${ext}`;
