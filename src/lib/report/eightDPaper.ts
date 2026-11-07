/* THE 8D REPORT ON PAPER (FC-150; docs/METHODS.md §16) — D0 to D8 from the method's answers, as lib/eightD says them: the same
 * states, the same is / is-not pairs, the same action list as the board, so the screen and the paper cannot part. Laid out by the
 * report engine (blocks that measure themselves), light paper, a state beside its word. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block, type Frame } from './flow';
import { SIZE, font, heading, label, rows, text, wrap, lead, type Row } from './blocks';
import { DISCIPLINES, actionRows, allStates, closingLine, disciplineLines, isNotPairs, type Ans } from '../eightD';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#1b2328', INK2 = '#475569', MUTED = '#64748b', LINE = '#c9d1d4';

export interface EightDIn { project: string; printed: string; answers: Ans }

/** A row of columns, each a wrapped cell; measures itself. */
function cells(cols: { w: number; t: string; bold?: boolean }[]): Row {
  const pad = 4;
  const lines = (f: Frame) => cols.map(c => wrap(f.doc, c.t || '—', f.w * c.w - 2 * pad, SIZE.small, c.bold ? 'bold' : 'normal'));
  return {
    h: f => Math.max(...lines(f).map(l => l.length)) * lead(SIZE.small, f.density) + 2 * pad,
    draw: (f, y) => {
      const ls = lines(f); let x = f.x;
      const h = Math.max(...ls.map(l => l.length)) * lead(SIZE.small, f.density) + 2 * pad;
      f.doc.setDrawColor(LINE); f.doc.line(f.x, y + h, f.x + f.w, y + h);
      cols.forEach((c, i) => {
        font(f.doc, SIZE.small, c.bold ? 'bold' : 'normal', c.t ? INK : MUTED);
        ls[i].forEach((s, j) => f.doc.text(s, x + pad, y + pad + SIZE.small * 0.92 + j * lead(SIZE.small, f.density)));
        x += f.w * c.w;
      });
    },
  };
}

export function eightDBlocks(x: EightDIn): Block[] {
  const a = x.answers, st = allStates(a);
  const out: Block[] = [text({ text: `${x.project} · printed ${x.printed}`, size: SIZE.small, colour: MUTED, after: 2 })];
  out.push(heading('8D report', closingLine(a)));
  out.push(label('The eight disciplines, in words'));
  out.push(rows({ rows: DISCIPLINES.map((d, i) => cells([{ w: 0.1, t: d.key, bold: true }, { w: 0.4, t: d.name }, { w: 0.5, t: st[i].says }])), after: 'm' }));
  DISCIPLINES.forEach((d, i) => {
    out.push(heading(`${d.key}  ${d.name}`, `${st[i].says}. ${d.asks}`, { size: SIZE.h2 }));
    if (d.key === 'D2') {
      out.push(rows({
        header: cells([{ w: 0.16, t: '', bold: true }, { w: 0.42, t: 'IS', bold: true }, { w: 0.42, t: 'IS NOT', bold: true }]),
        rows: isNotPairs(a).map(p => cells([{ w: 0.16, t: p.q, bold: true }, { w: 0.42, t: p.is }, { w: 0.42, t: p.isnot }])), after: 's',
      }));
    }
    for (const l of disciplineLines(d, a).filter(() => d.key !== 'D2')) {
      out.push(text({ text: l.label.toUpperCase(), size: SIZE.label, style: 'bold', colour: MUTED, after: 1 }));
      out.push(text({ text: l.text || 'Not written yet.', colour: l.text ? INK2 : MUTED, after: 4 }));
    }
    if (d.key === 'D2') for (const l of [['What it is', a.is], ['What it is not', a.isnot]] as const) if ((l[1] ?? '').trim()) out.push(text({ text: `${l[0]}: ${l[1].trim()}`, colour: INK2, after: 3 }));
    if (d.key === 'D6') {
      const acts = actionRows(a);
      out.push(label('The actions — who, by when, done'));
      out.push(acts.length
        ? rows({ rows: acts.map(r => cells([{ w: 0.06, t: String(r.n) }, { w: 0.5, t: r.what }, { w: 0.18, t: r.who }, { w: 0.14, t: r.due }, { w: 0.12, t: r.done ? 'Done' : 'Open' }])), after: 's' })
        : text({ text: 'No action is listed yet.', colour: MUTED }));
    }
  });
  return out;
}

export async function drawEightDPaper(doc: jsPDF, x: EightDIn): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const build = () => eightDBlocks(x);
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`8D report · ${x.project} · printed ${x.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

export async function saveEightDPdf(x: EightDIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { todayISO } = await import('../weeks');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `8D report — ${x.project}`);
  await drawEightDPaper(doc, x);
  await deliverPdf(doc, pdfFileName(x.project, '8D report', todayISO()));
}
