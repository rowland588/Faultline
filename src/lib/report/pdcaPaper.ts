/* THE PDCA CYCLE RECORD ON PAPER (docs/METHODS.md §16) — every cycle of the project's PDCA, quarter by quarter, as the board says them:
 * one module (lib/methodPdca) reads the answers for both, so the screen and the paper cannot part. Laid out by the report engine
 * (blocks that measure themselves), never by a hand-kept y. No figure here is worked out — it is what the team wrote. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from './flow';
import { SIZE, font, heading, label, text } from './blocks';
import { cyclesOf, cycleLine } from '../methodPdca';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#475569', MUTED = '#64748b';

export interface PdcaPaperIn { project: string; printed: string; answers: Record<string, string> }

export function pdcaBlocks(x: PdcaPaperIn): Block[] {
  const cycles = cyclesOf(x.answers);
  const out: Block[] = [text({ text: `${x.project} · printed ${x.printed}`, size: SIZE.small, colour: MUTED, after: 2 })];
  out.push(heading('The cycles at a glance', `${cycles.length} cycle${cycles.length === 1 ? '' : 's'} of Plan, Do, Check, Act.`));
  cycles.forEach(c => out.push(text({ text: cycleLine(c), size: SIZE.small, colour: INK2, bullet: '•', indent: 10, after: 3 })));
  for (const c of cycles) {
    out.push(heading(`Cycle ${c.n}`, c.status));
    for (const q of c.quarters) {
      out.push(label(`${q.name} — ${q.word.toLowerCase()}`));
      for (const fl of q.fields) {
        const v = (c.answers[fl.id] ?? '').trim();
        out.push(text({ text: fl.label, size: SIZE.small, style: 'bold', colour: INK2, after: 1 }));
        out.push(text({ text: v || 'Not written yet.', size: SIZE.small, colour: v ? INK2 : MUTED, indent: 10, after: 4 }));
      }
    }
  }
  return out;
}

export async function drawPdcaPaper(doc: jsPDF, x: PdcaPaperIn): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const build = () => pdcaBlocks(x);
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`PDCA cycle record · ${x.project} · printed ${x.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

export async function savePdcaPdf(x: PdcaPaperIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { todayISO } = await import('../weeks');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `PDCA cycle record — ${x.project}`);
  await drawPdcaPaper(doc, x);
  await deliverPdf(doc, pdfFileName(x.project, 'pdca cycle record', todayISO()));
}
