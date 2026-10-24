/* THE RATCHET — raw style values that may only come down (docs/STRUCTURE.md §7, B1).
 *
 * The tokens in src/styles.css are the house's sizes, colours and corners; every literal written
 * beside them is a value somebody chose for one screen. Counted here as the lint ceiling counts
 * warnings: a ceiling that only ever comes down. A change that removes some lowers the number here
 * in the same commit; a change that adds one is told which and where — never raise a ceiling to
 * get green. Measured on 23 October (B1); B7 brings them down page by page. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const css = readFileSync(join(ROOT, 'styles.css'), 'utf8');
const distinct = (xs: string[]) => [...new Set(xs)].sort();

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === '__tests__' ? [] : tsxFiles(p);
    return f.endsWith('.tsx') ? [p] : [];
  });
}

/** What is counted, and how. */
export function measure() {
  return {
    /** font-size written as a number, not a token */
    fontSizes: distinct([...css.matchAll(/font-size:\s*([0-9.]+(?:px|rem|em))/g)].map(m => m[1])),
    /** colours written as hex, the tokens' own definitions among them */
    hex: distinct([...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0].toLowerCase())),
    /** colours written as rgb() or rgba() */
    rgba: distinct([...css.matchAll(/rgba?\([^)]*\)/g)].map(m => m[0].replace(/\s/g, ''))),
    /** corners written as a number, not a token */
    radii: distinct([...css.matchAll(/border-radius:\s*([^;]+);/g)].map(m => m[1].trim()).filter(v => !v.startsWith('var('))),
    /** widths at which a page changes */
    breakpoints: distinct([...css.matchAll(/@media[^{]*\((?:max|min)-width:\s*([0-9.]+px)/g)].map(m => m[1])),
    /** style={{ … }} written on an element in a screen or a part */
    inline: tsxFiles(ROOT).reduce((n, f) => n + (readFileSync(f, 'utf8').match(/style=\{\{/g) ?? []).length, 0),
  };
}

/** The ceilings — only ever lowered. */
const CEILING = { fontSizes: 4, hex: 108, rgba: 125, radii: 6, breakpoints: 4, inline: 515 };   // B7 (24 October): breakpoints 28 → 4 (719/720 and 1099/1100, the two edges of phone · tablet · desk); fontSizes 52 → 4 (the six type tokens and --t-mark; the four em sizes that size against their parent stay); radii 27 → 6 (--radius, --radius-sm, --radius-lg and the three B7 added — xs for a tag, pill, round — the six raw left are 0, inherit and shorthand corners built of tokens)

describe('the ratchet: raw style values only come down', () => {
  const now = measure();
  for (const k of Object.keys(CEILING) as (keyof typeof CEILING)[]) {
    it(`${k}: no more than ${CEILING[k]}`, () => {
      const n = typeof now[k] === 'number' ? (now[k] as number) : (now[k] as string[]).length;
      if (n < CEILING[k]) console.log(`ratchet: ${k} is ${n}, below its ceiling of ${CEILING[k]} — lower CEILING.${k} to ${n} in the same commit`);
      expect(n, `${k}: ${typeof now[k] === 'number' ? '' : (now[k] as string[]).join(' ')}`).toBeLessThanOrEqual(CEILING[k]);
    });
  }
});
