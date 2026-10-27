/* EVERY MACHINE IN THE FACTORY ON PAPER — the Factory's Machines tab, line by line (lib/factoryMachines).
 *
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md): the factory's machines in a sentence, then
 * each line in floor order with its machines in flow order — who made it, the project on it, its programs proved
 * of planned, and on the right the problems open on it, the critical in red with the word. A factory too big for
 * a page carries on rather than leaving a machine out. */
import { paperBand } from './reportKit';
import type { jsPDF } from 'jspdf';
import type { FactoryMachines, FactoryMachineRow } from './factoryMachines';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, label, rows, text, wrap } from './report/blocks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489', DANGER = '#c4281c';

const pad = (f: Frame) => (f.density === 'compact' ? 4 : 7);

function blocksOf(r: FactoryMachines, printed: string, d: Density): Block[] {
  const out: Block[] = [];
  out.push(text({ text: 'FACTORY · EVERY MACHINE', size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: 'The factory’s machines', size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: `Printed ${printed}`, colour: MUTED, after: gap(d, 'm') }));
  const saysLines = (f: Frame) => wrap(f.doc, r.says, f.w - 28, 11, 'bold');
  out.push(box(f => 14 + saysLines(f).length * 14 + gap(f.density, 'm'), (f, y) => {
    const l = saysLines(f), h = 10 + l.length * 14;
    paperBand(f.doc, f.x, y, f.w, h, 6);
    font(f.doc, 11, 'bold', '#0f1417'); f.doc.text(l, f.x + 14, y + 17);
  }, f => gap(f.density, 'm')));

  const rightW = 120, numW = 22;
  const parts = (f: Frame, x: FactoryMachineRow) => ({
    head: wrap(f.doc, `${x.name}${x.oem ? ` — ${x.oem}` : ''}`, f.w - rightW - numW - 10, 10, 'bold'),
    sub: wrap(f.doc, [x.project ? `With ${x.project}` : 'No project on it',
      x.programs ? `${x.proved} of ${x.programs} program${x.programs === 1 ? '' : 's'} proved` : 'No programs'].join('   ·   '), f.w - rightW - numW - 10, 8.5),
  });
  for (const g of r.groups) {
    out.push(label(`${g.line.name}${g.line.lineType ? ` — ${g.line.lineType}` : ''} · ${g.rows.length ? `${g.rows.length} machine${g.rows.length === 1 ? '' : 's'}` : 'no machines named yet'}`));
    if (!g.rows.length) continue;
    out.push(rows({
      rows: g.rows.map(x => ({
        h: (f: Frame) => { const p = parts(f, x); return 2 * pad(f) + p.head.length * 12.5 + p.sub.length * 10.5; },
        draw: (f: Frame, top: number) => {
          const p = parts(f, x);
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, top, f.x + f.w, top);
          const y = top + pad(f) - 7;
          font(f.doc, 10, 'bold', MUTED); f.doc.text(String(x.n), f.x, y + 14);
          font(f.doc, 10, 'bold', INK2); f.doc.text(p.head, f.x + numW, y + 14);
          font(f.doc, 8.5, 'normal', x.project ? INK2 : MUTED); f.doc.text(p.sub, f.x + numW, y + 14 + p.head.length * 12.5 - 2);
          const open = x.open ? `${x.open} problem${x.open === 1 ? '' : 's'} open` : 'No problems open';
          font(f.doc, 9, x.open ? 'bold' : 'normal', x.open ? INK2 : MUTED); f.doc.text(open, f.x + f.w, y + 14, { align: 'right' });
          if (x.critical) { font(f.doc, 8.5, 'bold', DANGER); f.doc.text(`${x.critical} critical`, f.x + f.w, y + 26, { align: 'right' }); }
        },
      })),
      after: 'm',
    }));
  }
  return out;
}

/** Draw every machine in the factory into `doc`, every machine always on it. */
export async function drawFactoryMachines(doc: jsPDF, r: FactoryMachines, printed: string): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(r, printed, d));
  await pour({ ...base, density, dry: false }, blocksOf(r, printed, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`The factory’s machines  ·  ${printed}  ·  each machine's own page has its tests, programs and studies`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
