/* THE PRODUCT'S NAME — one place (11 November, docs/LUNA-BRAND.md). Rowland: "The customer-facing product name is LUNA — Lean Unified
 * Network Assistant. This is the identity of the entire product … Faultline is the previous product identity."
 *
 * Every word a customer reads that names the product reads from here: the top bar, the landing page, the install sheet, the update
 * banner, a paper's foot, a file's name. Internal identifiers — storage keys (`faultline.*`), the database's objects, CSS classes, the
 * domain, the font files — are NOT the product's name and stay as they are (docs/LUNA-BRAND.md §1, kinds C and D). */
export const PRODUCT = {
  /** The name, as written in a sentence. */
  name: 'Luna',
  /** The name as the wordmark sets it. */
  mark: 'LUNA',
  /** What the letters stand for. */
  expansion: 'Lean Unified Network Assistant',
  /** The line under the name. */
  line: 'Your intelligent colleague for manufacturing',
  /** The statement. */
  statement: 'From the factory floor to the boardroom',
  /** The maker. */
  parent: 'Opex Elevate',
  /** The address, unchanged until the domain is decided (docs/LUNA-BRAND.md R3). */
  domain: 'faultline.opexelevate.co.uk',
} as const;

/** A file's name, made by the product: "Luna-export-2026-11-11.xlsx". */
export const productFile = (what: string, ext: string): string => `${PRODUCT.name}-${what}.${ext}`;
