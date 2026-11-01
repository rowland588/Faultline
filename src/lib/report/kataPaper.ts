/* THE KATA STORYBOARD ON PAPER (docs/METHODS.md §16; lib/kataBoard) — the challenge, the current and target condition, the obstacles,
 * every experiment (step, expected, actual, learned, day) and the five coaching questions with their answers, from the same module
 * as the screen (lib/kataBoard storyboard), laid out by the report engine (blocks that measure themselves), light only. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from './flow';
import { SIZE, font, heading, label, text } from './blocks';
import { storyboard, ROW_LABELS } from '../kataBoard';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', AMBER = '#b45309';

export interface KataPaperIn { project: string; printed: string; answers: Record<string, string>; todayISO: string }

export function kataBlocks(x: KataPaperIn): Block[] {
  const sb = storyboard(x.answers, x.todayISO);
  const out: Block[] = [text({ text: `${x.project} · printed ${x.printed}`, size: SIZE.small, colour: MUTED, after: 2 })];
  out.push(heading('The storyboard', sb.pulse.says));
  for (const c of sb.cells) {
    out.push(label(c.title));
    out.push(c.said ? text({ text: c.said, colour: INK2, after: 4 }) : text({ text: c.missing, size: SIZE.small, colour: AMBER, after: 4 }));
  }
  out.push(heading('Experiments', 'Each a written expectation before the step, a result and a lesson after.'));
  if (!sb.rows.length) out.push(text({ text: 'No experiment is written yet.', size: SIZE.small, colour: AMBER }));
  for (const r of sb.rows) {
    out.push(label(`Experiment ${r.n}${r.ran ? ` · ${r.ran}` : ''}`));
    const line = (k: 'step' | 'prediction' | 'result' | 'learning') => text({ text: `${ROW_LABELS[k]}: ${r[k] || 'not written yet'}`, size: SIZE.small, colour: r[k] ? INK2 : AMBER, bullet: '•', indent: 10, after: 2 });
    out.push(line('step'), line('prediction'), line('result'), line('learning'));
  }
  out.push(heading('The five coaching questions'));
  for (const c of sb.coaching) {
    out.push(label(`${c.n}. ${c.ask}`));
    if (c.said.length) c.said.forEach(s => out.push(text({ text: s, size: SIZE.small, colour: INK2, after: 2 })));
    else out.push(text({ text: c.missing ?? '', size: SIZE.small, colour: AMBER }));
  }
  out.push(text({ text: 'Every line is a person’s words; nothing reads a machine. The verdict is on the pattern, not one day’s number.', size: SIZE.small, colour: MUTED }));
  return out;
}

export async function drawKataPaper(doc: jsPDF, x: KataPaperIn): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const build = () => kataBlocks(x);
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`Kata storyboard · ${x.project} · printed ${x.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

export async function saveKataPdf(x: KataPaperIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `Kata storyboard — ${x.project}`);
  await drawKataPaper(doc, x);
  await deliverPdf(doc, pdfFileName(x.project, 'kata storyboard', x.todayISO));
}
