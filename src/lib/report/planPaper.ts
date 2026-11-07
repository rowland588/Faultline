/* THE WEEK'S PLAN ON PAPER (FC-179, FC-043; knowledge/specs/FC-179-week-schedule.md, FC-043-drum-buffer-rope.md) — the schedule laid on the
 * constraint and, when a buffer is given, each order's place in it, as the line's capacity page says them: one module (tools/plan), so the
 * screen and the paper cannot part. Laid out by the report engine (blocks that measure themselves), never by a hand-kept y. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from './flow';
import { SIZE, font, heading, label, text } from './blocks';
import type { Plan } from '../../tools/plan/planInputs';
import { hoursWords } from '../../tools/plan/schedule';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#475569', MUTED = '#64748b', AMBER = '#b45309', RED = '#c4281c';

export interface PlanPaperIn { line: string; printed: string; plan: Plan }

export function planBlocks(x: PlanPaperIn): Block[] {
  const { plan } = x, s = plan.sched, d = plan.dbr;
  const out: Block[] = [text({ text: `${x.line} · printed ${x.printed}`, size: SIZE.small, colour: MUTED, after: 2 })];
  if (!s) {
    out.push(heading('The week’s schedule against capacity'), text({ text: plan.needs ?? 'Nothing is laid on the week yet.', colour: INK2 }));
    return out;
  }
  out.push(heading('The week’s schedule against capacity, with changeovers', s.says));
  out.push(label('The runs, in the order given'));
  s.lines.forEach(l => out.push(text({ text: l, size: SIZE.small, colour: INK2, bullet: '•', indent: 10, after: 3 })));
  if (s.moneyLines.length) { out.push(label('In money — apart, never summed')); s.moneyLines.forEach(m => out.push(text({ text: m, size: SIZE.small, colour: INK2, after: 3 }))); }
  out.push(label('How it is known'));
  out.push(text({ text: `Each run is its quantity at the rate the line can be planned on (${plan.planned.says}), a changeover between two different products, the runs end to end through ${plan.days.length} running day${plan.days.length === 1 ? '' : 's'} — ${hoursWords(s.weekMin)} of running. The order is the planner’s; this is what that order does.`, size: SIZE.small, colour: INK2 }));
  s.missing.forEach(m => out.push(text({ text: m, size: SIZE.small, colour: AMBER })));
  if (d) {
    out.push(heading('Protecting the constraint — drum, buffer, rope', d.says));
    out.push(label(`Each order's place in the ${hoursWords(d.bufferH * 60)} buffer`));
    d.rows.filter(r => r.zone !== 'done').forEach(r => out.push(text({ text: `${r.word.toUpperCase()} — ${r.says}${r.release && r.zone !== 'here' ? ` Release ${r.release}.` : ''}`, size: SIZE.small, colour: r.tone === 'r' ? RED : r.tone === 'a' ? AMBER : INK2, bullet: '•', indent: 10, after: 3 })));
    if (d.wip) out.push(text({ text: d.lines.find(l => l.startsWith('The buffer holds')) ?? '', size: SIZE.small, colour: INK2 }));
    out.push(label('Tuning the buffer'));
    out.push(text({ text: d.tune.says, size: SIZE.small, colour: INK2 }));
    out.push(text({ text: 'Time here is the drum’s running time, not the clock; the drum is where the orders marked done leave it. A hole in the drum is the run it cannot make. Every figure is a person’s tap or typed — nothing reads a machine.', size: SIZE.small, colour: MUTED }));
    d.missing.forEach(m => out.push(text({ text: m, size: SIZE.small, colour: AMBER })));
  }
  return out;
}

/** Draw the plan on a page of its own (more if it needs them). */
export async function drawWeekPlanPaper(doc: jsPDF, x: PlanPaperIn): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const build = () => planBlocks(x);
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`The week’s plan · ${x.line} · printed ${x.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

/** Made and handed over: saved to the device, the bar offering Open and Send. */
export async function saveWeekPlanPdf(x: PlanPaperIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { todayISO } = await import('../weeks');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `The week’s plan — ${x.line}`);
  await drawWeekPlanPaper(doc, x);
  await deliverPdf(doc, pdfFileName(x.line, 'weeks plan', todayISO()));
}
