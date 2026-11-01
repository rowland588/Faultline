/* THE KAIZEN EVENT REPORT (docs/METHODS.md §16) — the charter, the week day by day and the 30-day check, from the method's answers as
 * lib/kaizenEvent reads them: the same module the board is drawn from, so the screen and the paper cannot part. Laid out by the
 * report engine (blocks that measure themselves), never by a hand-kept y. Light paper; a verdict is always its word. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from './flow';
import { SIZE, font, heading, label, text } from './blocks';
import { checkOf, dayWords, daysOf, eventSays, type Answers } from '../kaizenEvent';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', AMBER = '#b45309', RED = '#c4281c', GREEN = '#15803d';

export interface KaizenPaperIn { project: string; printed: string; today: string; answers: Answers }

const said = (s: string | undefined) => (s ?? '').trim();
const NONE = 'Not written.';

export function kaizenBlocks(x: KaizenPaperIn): Block[] {
  const a = x.answers;
  const out: Block[] = [text({ text: `${x.project} · printed ${x.printed}`, size: SIZE.small, colour: MUTED, after: 2 })];
  out.push(heading('Kaizen event report', eventSays(a, x.today)));

  out.push(label('The charter'));
  const one = (q: string, v: string | undefined) => out.push(text({ text: `${q}: ${said(v) || NONE}`, size: SIZE.small, colour: said(v) ? INK2 : MUTED, after: 3 }));
  one('Charter', a['charter']); one('Sponsor', a['sponsor']); one('Measure and target', a['target']);
  one('Team', a['team']); one('Dates', a['dates'] || (a['start'] ? `from ${dayWords(a['start'], true)}` : '')); one('Baseline', a['baseline']);

  out.push(heading('The week, day by day'));
  for (const d of daysOf(a)) {
    out.push({ ...text({ text: `Day ${d.n}${d.iso ? ` — ${dayWords(d.iso, true)}` : ''} · ${d.word}`, size: SIZE.body, style: 'bold', colour: INK2, before: 4, after: 3 }), keepWithNext: true });
    if (d.word === 'Not written') continue;
    out.push(text({ text: `Seen: ${d.see || NONE}`, size: SIZE.small, colour: d.see ? INK2 : MUTED, after: 2, indent: 10 }));
    out.push(text({ text: `Changed: ${d.change || NONE}`, size: SIZE.small, colour: d.change ? INK2 : MUTED, after: 2, indent: 10 }));
    out.push(text({ text: `Measure at the close: ${d.measure || NONE}`, size: SIZE.small, colour: d.measure ? INK2 : MUTED, after: 4, indent: 10 }));
  }

  out.push(heading('What the week found and changed'));
  one('The waste seen', a['waste']); one('Changes tried, and measured', a['tried']); one('The measure after the changes', a['after']);
  out.push(heading('The new way'));
  one('Written', a['written']); one('Trained', a['trained']);

  const c = checkOf(a, x.today);
  out.push(heading('The 30-day check', c.says));
  out.push(text({ text: `Verdict: ${c.verdict ?? 'Not recorded yet'}`, size: SIZE.body, style: 'bold', colour: c.verdict ? (c.tone === 'g' ? GREEN : c.tone === 'a' ? AMBER : RED) : MUTED, after: 3 }));
  one('Open actions to the check', a['open']); one('The measure at 30 days', a['holding']); one('What the week bought', a['worth']);
  out.push(text({ text: 'Every figure here was counted, timed or written by a person; nothing reads a machine. The check is the test of the week — a gain that has crept back was a demonstration, not an improvement.', size: SIZE.small, colour: MUTED }));
  return out;
}

export async function drawKaizenPaper(doc: jsPDF, x: KaizenPaperIn): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const build = () => kaizenBlocks(x);
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`Kaizen event report · ${x.project} · printed ${x.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

export async function saveKaizenPdf(x: KaizenPaperIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `Kaizen event report — ${x.project}`);
  await drawKaizenPaper(doc, x);
  await deliverPdf(doc, pdfFileName(x.project, 'kaizen event report', x.today));
}
