/* THE CONSTRAINT REVIEW — Theory of Constraints' own paper (docs/METHODS.md §16). The five focusing steps as the board says them
 * (shapes/tocModel — one module, so the screen and the paper cannot part): what the line itself reads at each step, what is missing and
 * where to give it, the person's own words, and the passes round the loop. Laid out by the report engine (blocks that measure themselves,
 * never a hand-kept y); light only. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from '../../../lib/report/flow';
import { SIZE, font, heading, label, text } from '../../../lib/report/blocks';
import { tocPasses, tocSteps, type TocRecords, type TocStep } from './tocModel';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#475569', MUTED = '#64748b', AMBER = '#b45309';

export interface TocPaperIn { project: string; printed: string; answers: Record<string, string>; steps: TocStep[] }

export const tocPaperIn = (project: string, printed: string, answers: Record<string, string>, rec: TocRecords): TocPaperIn =>
  ({ project, printed, answers, steps: tocSteps(answers, rec) });

export function tocBlocks(x: TocPaperIn): Block[] {
  const out: Block[] = [text({ text: `${x.project} · Theory of Constraints · printed ${x.printed}`, size: SIZE.small, colour: MUTED, after: 2 })];
  const first = x.steps[0];
  out.push(heading('Constraint review', first?.says || 'The constraint is not read yet.'));
  for (const s of x.steps) {
    out.push(heading(`${s.n}. ${s.section}`, s.says, { size: SIZE.h2 }));
    out.push(text({ text: `${s.title} — ${s.state.word}: ${s.state.written} of ${s.state.fields} written`, size: SIZE.small, colour: MUTED }));
    s.lines.forEach(l => out.push(text({ text: l, size: SIZE.small, colour: INK2, bullet: '•', indent: 10, after: 3 })));
    s.missing.forEach(m => out.push(text({ text: `Missing: ${m}`, size: SIZE.small, colour: AMBER })));
    out.push(label('In the team’s words'));
    for (const a of s.answers) out.push(text({ text: `${a.label}: ${a.value || 'not written yet'}`, size: SIZE.small, colour: a.value ? INK2 : MUTED, after: 3 }));
  }
  const ps = tocPasses(x.answers);
  out.push(heading('Going again', ps.length === 1 ? 'One pass so far.' : `${ps.length} passes round the loop.`));
  ps.forEach(p => out.push(text({ text: `Pass ${p.n}: the constraint ${p.constraint || 'not written yet'}${p.moved ? `; it moved to ${p.moved}` : ''}.`, size: SIZE.small, colour: INK2, bullet: '•', indent: 10, after: 3 })));
  out.push(text({ text: 'Every figure is read from the project’s own Line capacity, loss count and week plan, or written by a person — nothing reads a machine, and where an input is missing it is named, never invented.', size: SIZE.small, colour: MUTED, before: 6 }));
  return out;
}

export async function drawTocPaper(doc: jsPDF, x: TocPaperIn): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const build = () => tocBlocks(x);
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`Constraint review · ${x.project} · printed ${x.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

export async function saveTocPdf(x: TocPaperIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../../../lib/savePdf');
  const { pdfFileName } = await import('../../../lib/fileName');
  const { todayISO } = await import('../../../lib/weeks');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `Constraint review — ${x.project}`);
  await drawTocPaper(doc, x);
  await deliverPdf(doc, pdfFileName(x.project, 'constraint review', todayISO()));
}
