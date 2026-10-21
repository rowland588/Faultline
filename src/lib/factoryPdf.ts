/* YOUR FACTORY ON PAPER — one A4 page: every line in floor order, its type,
 * the jobs on it and what is open on it (lib/factoryReport).
 *
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md): the
 * factory in a sentence, then a row a line. A factory too big for a page
 * carries on rather than leaving a line out. */
import { paperBand } from './reportKit';
import type { jsPDF } from 'jspdf';
import type { FactoryReading, FactoryRow } from './factoryReport';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, label, rows, text, wrap } from './report/blocks';
import { leanClosing, leanTiles } from './report/lean';
import { factoryClosing, factoryTiles } from './factoryLean';
import { fmtGBP } from './cost';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489', DANGER = '#c4281c';

const pad = (f: Frame) => (f.density === 'compact' ? 4 : 7);

function blocksOf(r: FactoryReading, d: Density): Block[] {
  const out: Block[] = [];
  out.push(text({ text: 'YOUR FACTORY · EVERY LINE', size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: 'Your factory', size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: `Printed ${r.printed}`, colour: MUTED, after: gap(d, 'm') }));

  /* THE FACTORY IN ONE SENTENCE — and under it the lean page's tiles
     (lib/factoryLean): the lines, what is open and late on them, and what a
     day of the factory is worth. The line under the sentence that said what
     was open is in the tiles now. */
  const saysLines = (f: Frame) => wrap(f.doc, r.says, f.w - 28, 11, 'bold');
  out.push(box(f => 14 + saysLines(f).length * 14 + gap(f.density, 'm'), (f, y) => {
    const l = saysLines(f), h = 10 + l.length * 14;
    paperBand(f.doc, f.x, y, f.w, h, 6);
    font(f.doc, 11, 'bold', '#0f1417'); f.doc.text(l, f.x + 14, y + 17);
  }, f => gap(f.density, 'm')));
  out.push(leanTiles(factoryTiles(r)));

  /* EVERY LINE, IN FLOOR ORDER — its place, name and type; the jobs on it;
     on the right what is open, the late in red with the word. */
  out.push(label('The lines, in floor order'));
  const rightW = 120, numW = 22;
  const parts = (f: Frame, x: FactoryRow) => ({
    head: wrap(f.doc, `${x.name}${x.type ? ` — ${x.type}` : ''}`, f.w - rightW - numW - 10, 10, 'bold'),
    jobs: wrap(f.doc, [x.jobs.length ? `On: ${x.jobs.join(', ')}` : 'No project on it', x.facts ?? '', x.margin != null ? `${fmtGBP(x.margin)} of margin a day` : ''].filter(Boolean).join('   ·   '), f.w - rightW - numW - 10, 8.5),
  });
  out.push(rows({
    rows: r.rows.map(x => ({
      h: (f: Frame) => { const p = parts(f, x); return 2 * pad(f) + p.head.length * 12.5 + p.jobs.length * 10.5; },
      draw: (f: Frame, top: number) => {
        const p = parts(f, x);
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, top, f.x + f.w, top);
        const y = top + pad(f) - 7;
        /* its place on the floor, in its own column */
        font(f.doc, 10, 'bold', MUTED); f.doc.text(String(x.n), f.x, y + 14);
        font(f.doc, 10, 'bold', INK2); f.doc.text(p.head, f.x + numW, y + 14);
        font(f.doc, 8.5, 'normal', x.jobs.length ? INK2 : MUTED); f.doc.text(p.jobs, f.x + numW, y + 14 + p.head.length * 12.5 - 2);
        const open = x.open ? `${x.open} open` : 'No problems open';
        font(f.doc, 9, x.open ? 'bold' : 'normal', x.open ? INK2 : MUTED); f.doc.text(open, f.x + f.w, y + 14, { align: 'right' });
        const red = [x.late ? `${x.late} late` : '', x.critical ? `${x.critical} critical` : ''].filter(Boolean).join(' · ');
        if (red) { font(f.doc, 8.5, 'bold', DANGER); f.doc.text(red, f.x + f.w, y + 26, { align: 'right' }); }
      },
    })),
    after: 'l',
  }));
  /* THE CLOSING LINE — what is open and where, and what a day is worth. */
  out.push(leanClosing(factoryClosing(r)));
  return out;
}

/** Draw Your factory into `doc`: one page where it fits, every line always on it. */
export async function drawFactoryReport(doc: jsPDF, r: FactoryReading): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(r, d));
  await pour({ ...base, density, dry: false }, blocksOf(r, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`Your factory  ·  ${r.printed}  ·  each line's own report has its problems`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
