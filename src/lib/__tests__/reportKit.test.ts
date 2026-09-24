/* WHAT REACHES THE PDF.
 *
 * jsPDF's built-in fonts are WinAnsi-encoded: no arrows, no general Unicode, no
 * box glyphs. A character the encoding does not have is not dropped politely —
 * it prints as a different character AND mis-measures, so a pill drawn around it
 * comes out the wrong width. "44 → 49 ppm" printed as "44 !' 49 ppm".
 *
 * san() is the one door every string comes through, which is exactly why it is
 * worth testing here rather than trusting each of a hundred call sites.
 */
import { describe, it, expect } from 'vitest';
import { san, wash } from '../reportKit';

/** Everything WinAnsi can render, plus the handful of Unicode punctuation the
 *  encoder maps for us. Anything else in a PDF string is a defect. */
const ENCODABLE = /^[ -ÿ–—‘’“”…]*$/;

describe('san collapses whitespace, which is the whole reason it exists', () => {
  it('turns a multi-line workbook cell into one line', () => {
    // The Action column is a running log: several dated updates typed into one
    // cell with alt-enter between them. jsPDF's splitTextToSize breaks on those
    // newlines first and does not re-wrap, so the second line drew straight over
    // the row beneath — "08" printed through the next action's title.
    const cell = '12/08 chased OEM\n19/08 parts on order\n26/08 fitted';
    expect(san(cell)).toBe('12/08 chased OEM 19/08 parts on order 26/08 fitted');
    expect(san(cell)).not.toContain('\n');
  });

  it('collapses every flavour of whitespace, not just newlines', () => {
    expect(san('a\r\nb\tc   d\u000bе'.replace('е', 'e'))).toBe('a b c d e');
    expect(san('  padded  ')).toBe('padded');
    expect(san('\n\n\n')).toBe('');
  });

  it('leaves an already-clean string alone', () => {
    expect(san('75 ppm at 98% OEE')).toBe('75 ppm at 98% OEE');
  });
});

describe('san maps what people type onto what the encoding has', () => {
  it('rewrites arrows rather than printing noise', () => {
    expect(san('44 → 49 ppm')).toBe('44 to 49 ppm');
    expect(san('49 ← 44')).toBe('49 <- 44');
  });

  it('rewrites ticks and bullets', () => {
    expect(san('✓ done')).toBe('v done');
    expect(san('✔ done')).toBe('v done');
    expect(san('• point')).toBe('· point');
  });

  it('keeps the punctuation WinAnsi does have', () => {
    // En dash, em dash, curly quotes and an ellipsis all survive, because
    // replacing them would make every report read as if typed on a terminal.
    const s = san('14 Jul – 6 Aug — the OEM’s “best” guess…');
    expect(s).toContain('–');
    expect(s).toContain('—');
    expect(s).toContain('’');
    expect(s).toContain('“');
    expect(s).toContain('…');
  });

  it('drops characters the encoding cannot render at all', () => {
    expect(san('rate 😀 ok')).toBe('rate ok');
    expect(san('速度')).toBe('');
    expect(san('▣ marker')).toBe('marker');
  });
});

describe('whatever goes in, what comes out is printable', () => {
  const nasty = [
    'plain text',
    '44 → 49 ppm ✓',
    'line one\nline two',
    'tab\tseparated',
    'emoji 🎯 and CJK 速度',
    'box ▣ and arrows ➡ ⇒',
    'non-breaking space and narrow one',
    'zero width​joiner‍',
    'NUL\u0000inside',
    'bell\u0007and\u001Bescape',
    'combining éaccent',
    ' line separator ',
    'maths − minus and × times',
    '',
    '     ',
  ];

  for (const input of nasty) {
    it(`is WinAnsi-safe for ${JSON.stringify(input).slice(0, 44)}`, () => {
      const out = san(input);
      expect(out, `sanitised output still carries something unprintable`).toMatch(ENCODABLE);
      expect(out).not.toContain('\n');
      expect(out).not.toContain('\t');
    });
  }

  it('never returns a string with a control character in it', () => {
    // A NUL or an escape inside a PDF text object corrupts the stream, and the
    // damage shows up as a file that will not open rather than as a wrong word.
    for (const input of nasty) {
      const out = san(input);
      // eslint-disable-next-line no-control-regex -- asserting the absence of them
      expect(/[\u0000-\u001F\u007F-\u009F]/.test(out), JSON.stringify(input)).toBe(false);
    }
  });
});

describe('wash mixes a colour towards white', () => {
  it('amount 1 leaves the colour exactly as it was', () => {
    expect(wash('#0b7d68', 1)).toEqual([0x0b, 0x7d, 0x68]);
  });

  it('amount 0 is white, not black', () => {
    // setFillColor has no alpha in jsPDF. The first version of the report drew
    // every box solid black and put dark text on top of it.
    expect(wash('#0b7d68', 0)).toEqual([255, 255, 255]);
  });

  it('a part-way mix sits between the colour and white', () => {
    const [r, g, b] = wash('#000000', 0.5);
    expect([r, g, b]).toEqual([128, 128, 128]);
  });

  it('accepts a hex with or without the hash', () => {
    expect(wash('0b7d68', 1)).toEqual(wash('#0b7d68', 1));
  });

  it('always returns three bytes in range', () => {
    for (const hex of ['#000000', '#ffffff', '#0b7d68', '#cc4436']) {
      for (const amount of [0, 0.15, 0.5, 0.85, 1]) {
        const out = wash(hex, amount);
        expect(out).toHaveLength(3);
        for (const c of out) {
          expect(Number.isInteger(c)).toBe(true);
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(255);
        }
      }
    }
  });
});
