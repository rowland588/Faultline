/* EVERY CHARACTER THE PDF LETS THROUGH HAS A GLYPH IN THE PDF FONT.
 *
 * jsPDF, meeting a character its embedded font cannot draw, drops the rest of
 * the line — "Within ±1.5 g over 200 packs" printed as "Within", and a result
 * of "±0.9 g over 200" printed as nothing. Instrument Sans has no ± µ ² ³ ½;
 * scripts/make-pdf-fonts.py fills them from Outfit. This reads the shipped
 * fonts' own character maps and fails if san() would let through anything
 * they cannot draw. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// Renamed: the lint reads anything called use… as a React hook.
import { pdfFamily, san, usePdfFamily as setPdfFamily } from '../reportKit';

/** The Unicode → glyph map of a TrueType font (cmap format 4, BMP). */
function cmapOf(path: string): Set<number> {
  const b = readFileSync(path);
  const u16 = (o: number) => b.readUInt16BE(o);
  const n = u16(4);
  let cmap = 0;
  for (let i = 0; i < n; i++) {
    const r = 12 + i * 16;
    if (b.toString('ascii', r, r + 4) === 'cmap') cmap = b.readUInt32BE(r + 8);
  }
  const tables = u16(cmap + 2);
  const out = new Set<number>();
  for (let i = 0; i < tables; i++) {
    const rec = cmap + 4 + i * 8;
    const sub = cmap + b.readUInt32BE(rec + 4);
    if (u16(sub) !== 4) continue;
    const segs = u16(sub + 6) / 2;
    const ends = sub + 14, starts = ends + segs * 2 + 2, deltas = starts + segs * 2, ranges = deltas + segs * 2;
    for (let s = 0; s < segs; s++) {
      const end = u16(ends + s * 2), start = u16(starts + s * 2), delta = u16(deltas + s * 2), ro = u16(ranges + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        const g = ro === 0 ? (c + delta) & 0xffff : u16(ranges + s * 2 + ro + (c - start) * 2);
        if (g !== 0) out.add(c);
      }
    }
  }
  return out;
}

const FONTS = ['InstrumentSans-Regular.ttf', 'InstrumentSans-Bold.ttf'];
/* Every character san() can let through, found by asking it about every
   character there is (the whole Basic Multilingual Plane), with the app's own
   fonts in use — not a list kept beside it, which is how the two drifted. */
function allowed(): number[] {
  const was = pdfFamily();
  setPdfFamily('Faultline');
  try {
    const out: number[] = [];
    for (let c = 0x20; c < 0x10000; c++) {
      if (c >= 0xd800 && c <= 0xdfff) continue;
      const ch = String.fromCodePoint(c);
      for (const x of san(`a${ch}b`).slice(1, -1)) out.push(x.codePointAt(0) ?? 0);
    }
    return [...new Set(out)].filter(c => c !== 0x20);
  } finally { setPdfFamily(was); }
}
const ALLOWED = allowed();

describe('the PDF fonts', () => {
  for (const f of FONTS) {
    it(`${f} draws every character a PDF can carry`, () => {
      const have = cmapOf(`src/assets/pdf-fonts/${f}`);
      const missing = ALLOWED.filter(c => !have.has(c)).map(c => String.fromCodePoint(c));
      expect(missing).toEqual([]);
    });
  }
  it('prints the names on a European site whole', () => {
    const was = pdfFamily();
    setPdfFamily('Faultline');
    try {
      for (const n of ['Łukasz Wójcik', 'Ştefan Ionescu', 'Agnieszka Szczęsna', 'Antonín Dvořák', 'Gülşen Öztürk', 'Ørjan Høgh', 'Zoë Brontë', 'Ffion Ŵyn', '€12,400'])
        expect(san(n)).toBe(n);
      // A letter the font lacks keeps its base letter rather than vanishing.
      expect(san('Ĉu Ĝi')).toBe('Cu Gi');
    } finally { setPdfFamily(was); }
  });
  it('in Helvetica (fonts not fetched), keeps the plain letter', () => {
    expect(pdfFamily()).toBe('helvetica');
    expect(san('Łukasz Wójcik · Dvořák · €5')).toBe('Lukasz Wójcik · Dvorák · EUR5');
  });
  it('spells out a limit sign rather than dropping it', () => {
    expect(san('Gap ≤ 0.5 mm, speed ≥ 120 ppm, 50 μm')).toBe('Gap <= 0.5 mm, speed >= 120 ppm, 50 µm');
  });
  it('drops what no font can draw, and the gap it leaves', () => {
    expect(san('rate 😀 ok\u0007')).toBe('rate ok');
  });
  it('keeps the tolerances a factory writes', () => {
    expect(san('Within ±1.5 g · 2 m² · 50 µm · ½ turn')).toBe('Within ±1.5 g · 2 m² · 50 µm · ½ turn');
  });
});
