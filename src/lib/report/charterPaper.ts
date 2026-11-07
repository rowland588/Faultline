/* THE CHARTER ON PAPER (DMAIC, ISO 13053-1; docs/METHODS.md §16) — the project's charter and its five phase reviews, made from the
 * same module as the board (project/method/shapes/dmaicModel), so the screen and the paper cannot part. Laid out by the report
 * engine (blocks that measure themselves), light only. A missing answer is named, never filled. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from './flow';
import { SIZE, font, heading, label, space, text } from './blocks';
import { charterOf, dayWords, gatesOf, gatesSay, RESULTS } from '../../project/method/shapes/dmaicModel';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#475569', MUTED = '#64748b', AMBER = '#b45309';

export interface CharterIn {
  project: string; printed: string;
  answers: Record<string, string>;
  /** What the project's tools already say (read-only): a tool, and its latest sentence. */
  evidence: { tool: string; says: string }[];
}

export function charterBlocks(x: CharterIn): Block[] {
  const c = charterOf(x.answers), gates = gatesOf(x.answers);
  const out: Block[] = [text({ text: `${x.project} · DMAIC · printed ${x.printed}`, size: SIZE.small, colour: MUTED, after: 2 })];
  out.push(heading('Charter', c.says));
  for (const r of c.rows) {
    out.push(label(r.label));
    out.push(r.value ? text({ text: r.value, colour: INK2, after: 4 }) : text({ text: 'Not written yet.', size: SIZE.small, colour: AMBER, after: 4 }));
  }
  out.push(space('m'));
  out.push(heading('The phase reviews', gatesSay(gates)));
  for (const g of gates) {
    const r = g.review;
    const by = r.who || r.when ? `${RESULTS.find(z => z.k === r.result)?.word ?? 'Review booked'}${r.who ? ` — ${r.who}` : ''}${r.when ? `, ${dayWords(r.when)}` : ''}` : 'No review held or booked yet';
    out.push(label(`${g.name} — ${g.state} · ${g.written} of ${g.fields} questions written`));
    out.push(text({ text: by, colour: INK2, after: r.note ? 2 : 4 }));
    if (r.note) out.push(text({ text: r.note, size: SIZE.small, colour: INK2, after: 4 }));
  }
  if (x.evidence.length) {
    out.push(space('m'), heading('What the project’s tools say', 'Read from the project’s own studies — a tool is never required.'));
    x.evidence.forEach(e => out.push(text({ text: `${e.tool}: ${e.says}`, size: SIZE.small, colour: INK2, bullet: '•', indent: 10, after: 3 })));
  }
  return out;
}

export async function drawCharterPaper(doc: jsPDF, x: CharterIn): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const build = () => charterBlocks(x);
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`Charter · ${x.project} · printed ${x.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

export async function saveCharterPdf(x: CharterIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { todayISO } = await import('../weeks');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `Charter — ${x.project}`);
  await drawCharterPaper(doc, x);
  await deliverPdf(doc, pdfFileName(x.project, 'charter', todayISO()));
}
