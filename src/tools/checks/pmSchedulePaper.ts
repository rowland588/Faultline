/* THE MAINTENANCE SCHEDULE ON PAPER — pmSchedule's model poured by the report engine (lib/report): the band (machine, line, customer,
 * the manual), the count by interval, a table an interval, what it rests on. Nothing here works anything out. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block, type Density, type Frame } from '../../lib/report/flow';
import { font, gap, label, rows, text, wrap } from '../../lib/report/blocks';
import { leanBand, leanHead } from '../../lib/report/lean';
import { bandPage } from '../../lib/lean';
import type { PmSchedule } from './pmSchedule';

const INK2 = '#475569', MUTED = '#64748b', LINE = '#e6eaf0';
const W = 595, H = 842, M = 36, CW = W - 2 * M;

function table(header: string[], body: string[][], shares: number[]): Block {
  const LH = 10.5, SZ = 8.5;
  const lines = (f: Frame, cells: string[], bold: boolean) => cells.map((c, i) => wrap(f.doc, c, f.w * shares[i] - 8, SZ, bold ? 'bold' : 'normal'));
  const hOf = (f: Frame, cells: string[], bold: boolean) => Math.max(1, ...lines(f, cells, bold).map(l => l.length)) * LH + 7;
  const row = (cells: string[], bold: boolean): Parameters<typeof rows>[0]['rows'][number] => ({
    h: (f: Frame) => hOf(f, cells, bold),
    draw: (fr: Frame, y: number) => {
      let x = fr.x;
      lines(fr, cells, bold).forEach((ls, i) => { font(fr.doc, SZ, bold ? 'bold' : 'normal', bold ? MUTED : INK2); ls.forEach((l, k) => fr.doc.text(l, x, y + 10 + k * LH)); x += fr.w * shares[i]; });
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(bold ? 0.6 : 0.3); const h = hOf(fr, cells, bold) - 2; fr.doc.line(fr.x, y + h, fr.x + fr.w, y + h);
    },
  });
  return rows({ header: row(header, true), rows: body.map(b => row(b, false)), after: 'm' });
}

export function pmScheduleBlocks(m: PmSchedule, printed: string, d: Density): Block[] {
  const facts: [string, string][] = [...(m.machine ? [['Machine', m.machine] as [string, string]] : []), ['Line', m.line || 'No line'], ...(m.customer ? [['For', m.customer] as [string, string]] : [])];
  const out: Block[] = [leanBand(bandPage('MAINTENANCE SCHEDULE', { name: m.title }, undefined, undefined, facts), printed)];
  out.push(text({ text: m.sentence, size: 10, colour: INK2, after: gap(d, 's') }));
  if (m.sources.length) { out.push(label('Drawn from')); for (const s of m.sources) out.push(text({ text: s, size: 9, colour: INK2, after: 2, bullet: '•', indent: 10 })); }
  const cols: { h: string; w: number; v: (r: PmSchedule['groups'][number]['rows'][number]) => string }[] = [
    { h: 'No.', w: 0.06, v: r => String(r.n) }, { h: 'Task', w: 0, v: r => r.task },
    ...(m.showWhere ? [{ h: 'Where', w: 0.14, v: (r: PmSchedule['groups'][number]['rows'][number]) => r.where }] : []),
    { h: m.showPage ? 'The manual says' : 'Interval', w: 0.2, v: r => r.says },
    ...(m.showWho ? [{ h: 'By', w: 0.12, v: (r: PmSchedule['groups'][number]['rows'][number]) => r.who }] : []),
    ...(m.showHours ? [{ h: 'Time', w: 0.08, v: (r: PmSchedule['groups'][number]['rows'][number]) => r.hours }] : []),
    ...(m.showPage ? [{ h: 'Page', w: 0.08, v: (r: PmSchedule['groups'][number]['rows'][number]) => r.page }] : []),
  ];
  const fixed = cols.reduce((a, c) => a + c.w, 0);
  const shares = cols.map(c => c.w || 1 - fixed);
  for (const g of m.groups) {
    out.push(leanHead(g.heading, `${g.rows.length} task${g.rows.length === 1 ? '' : 's'}`));
    out.push(table(cols.map(c => c.h), g.rows.map(r => cols.map(c => c.v(r))), shares));
  }
  out.push(leanHead('What this schedule rests on'));
  for (const n of m.notes) out.push(text({ text: n, size: 9, colour: INK2, after: 3, bullet: '•', indent: 10 }));
  return out;
}

export async function drawPmSchedule(doc: jsPDF, m: PmSchedule, printed: string): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => pmScheduleBlocks(m, printed, d));
  await pour({ ...base, density, dry: false }, pmScheduleBlocks(m, printed, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(wrap(doc, `Maintenance schedule — ${m.title}  ·  ${printed}`, CW - 60, 7.5)[0] ?? '', M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

export async function savePmSchedule(m: PmSchedule, printed: string, day: string): Promise<void> {
  const { loadPdfLib, deliverPdf } = await import('../../lib/savePdf');
  const { pdfFileName } = await import('../../lib/fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  await drawPmSchedule(doc, m, printed);
  await deliverPdf(doc, pdfFileName(m.title, 'maintenance schedule', day));
}
