/* THE PRODUCT'S NAME — one place. Since 11 November (Rowland): "LUNAR (L-U-N-A-R) is the product, platform and intelligent operational
 * environment. LUNA (L-U-N-A) is the AI colleague who lives within LUNAR … two separate names … Do not confuse them or use them
 * interchangeably." PRODUCT is LUNAR; the colleague is COLLEAGUE. Before (docs/LUNA-BRAND.md) Rowland: "The customer-facing product name is LUNA — Lean Unified
 * Network Assistant. This is the identity of the entire product … Faultline is the previous product identity."
 *
 * Every word a customer reads that names the product reads from here: the top bar, the landing page, the install sheet, the update
 * banner, a paper's foot, a file's name. Internal identifiers — storage keys (`faultline.*`), the database's objects, CSS classes, the
 * domain, the font files — are NOT the product's name and stay as they are (docs/LUNA-BRAND.md §1, kinds C and D). */
export const PRODUCT = {
  /** The name, as written in a sentence. */
  name: 'LUNAR',
  /** The name as the wordmark sets it. */
  mark: 'LUNAR',
  /** What the letters stand for (11 November, Rowland: "LUNAR — Learning, Understanding, Navigation, Analysis & Reasoning. It gives the
   *  brand substance without restricting what the platform can eventually become"). */
  expansion: 'Learning, Understanding, Navigation, Analysis & Reasoning',
  /** The five words, one a letter — the door draws each initial lit. */
  letters: ['Learning', 'Understanding', 'Navigation', 'Analysis', 'Reasoning'],
  /** The line under the name. */
  line: 'The intelligent operational environment',
  /** The statement. */
  statement: 'With Luna, your AI colleague, at its centre — from the factory floor to the boardroom',
  /** The maker. */
  parent: 'Opex Elevate',
  /** The address, unchanged until the domain is decided (docs/LUNA-BRAND.md R3). */
  domain: 'faultline.opexelevate.co.uk',
} as const;

/** The AI colleague who lives within LUNAR — never the product's name. */
export const COLLEAGUE = { name: 'Luna', mark: 'LUNA' } as const;

/** A file's name, made by the product: "LUNAR-export-2026-11-11.xlsx". */
export const productFile = (what: string, ext: string): string => `${PRODUCT.name}-${what}.${ext}`;
