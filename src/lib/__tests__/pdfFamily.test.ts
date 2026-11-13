/* THE PAPER'S TYPEFACE IS REGISTERED UNDER THE NAME IT IS ASKED FOR BY (12 November). The product was renamed and the family's name
 * inside the PDF went with it ('Faultline'), while the fonts were still added as 'Faultline' — so every paper fell back to Helvetica and
 * lost "−" and "Ł". Nothing on a screen showed it. The name asked for must be one of the names added. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('savePdf — the brand fonts', () => {
  it('asks for a family that it added', () => {
    const src = readFileSync('src/lib/savePdf.ts', 'utf8');
    const added = [...src.matchAll(/this\.addFont\('[^']+', '([^']+)'/g)].map(m => m[1]);
    const family = src.match(/kit\.usePdfFamily\('([^']+)'\)/)?.[1];
    const name = src.match(/kit\.usePdfNameFamily\('([^']+)'\)/)?.[1];
    expect(added.length).toBeGreaterThan(0);
    expect(added).toContain(family);
    expect(added).toContain(name);
  });
});
