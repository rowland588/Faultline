/* A REPORT'S HEADER, WITH THE CODE BACK TO THE LIVE JOB (docs/LEAN40.md, step
 * 1, "Scan the machine": "a paper that points to the live record is the
 * bridge from a report to the record").
 *
 * The eyebrow, the job's name and the printed line, as every report heads
 * itself — and, when the report knows the job's address, a small code beside
 * them with "Scan for it now" under it, and "as it stood at 16:40" on the
 * printed line. The code sits beside the title, so the header is no taller
 * than the title alone makes it: the one-page status stays one page.
 *
 * With no address, it is the three lines it always was — exactly. */
import { SIZE, font, gap, lead, text, wrap, box } from './blocks';
import type { Block, Density, Frame } from './flow';
import { drawQr } from '../qr';

const QS = 50, QGAP = 14;
const MUTED = '#5b6b82', INK = '#0f1a2e';

export function codeHeader(o: { eyebrow: string; title: string; line: string; colour: string; link?: string; at?: Date }, d: Density): Block[] {
  if (!o.link) {
    return [
      text({ text: o.eyebrow, size: SIZE.eyebrow, style: 'bold', colour: o.colour, after: 6 }),
      text({ text: o.title, size: SIZE.title, style: 'bold', after: 4 }),
      text({ text: o.line, colour: MUTED, after: gap(d, 'm') }),
    ];
  }
  const link = o.link;
  const at = (o.at ?? new Date()).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const line = `${o.line}   ·   as it stood at ${at}`;
  const tw = (f: Frame) => f.w - QS - QGAP;
  const parts = (f: Frame) => ({
    title: wrap(f.doc, o.title, tw(f), SIZE.title, 'bold'),
    line: wrap(f.doc, line, tw(f), SIZE.body),
  });
  const leftH = (f: Frame) => {
    const p = parts(f);
    return lead(SIZE.eyebrow, f.density) + 6 + p.title.length * lead(SIZE.title, f.density) + 4 + p.line.length * lead(SIZE.body, f.density);
  };
  const height = (f: Frame) => Math.max(leftH(f), QS + 12);
  return [box(f => height(f) + gap(f.density, 'm'), (f, y) => {
    const p = parts(f), dd = f.doc;
    let ty = y + SIZE.eyebrow;
    font(dd, SIZE.eyebrow, 'bold', o.colour); dd.text(o.eyebrow, f.x, ty);
    ty += lead(SIZE.eyebrow, f.density) - SIZE.eyebrow + 6 + SIZE.title;
    font(dd, SIZE.title, 'bold', INK);
    p.title.forEach((l, i) => dd.text(l, f.x, ty + i * lead(SIZE.title, f.density)));
    ty += (p.title.length - 1) * lead(SIZE.title, f.density) + 4 + lead(SIZE.body, f.density);
    font(dd, SIZE.body, 'normal', MUTED);
    p.line.forEach((l, i) => dd.text(l, f.x, ty + i * lead(SIZE.body, f.density)));
    const qx = f.x + f.w - QS;
    drawQr(dd, link, qx, y, QS);
    font(dd, 6.5, 'bold', MUTED); dd.text('Scan for it now', qx + QS / 2, y + QS + 8, { align: 'center' });
  }, f => gap(f.density, 'm'))];
}
