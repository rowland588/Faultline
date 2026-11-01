/* RECOVERY LEVERS ON PAPER (FC-039; knowledge/specs/FC-039-recovery-levers.md) — the plan the levers chosen buy, as the screen's panel says
 * it: the sentence (a shift and a week, the two money parts apart), each lever in its own line, where the prize is, what is not claimed and
 * what is still to give. Laid out by the report engine (blocks that measure themselves, poured into pages), never by a hand-kept y. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from './flow';
import { SIZE, font, heading, label, text } from './blocks';
import { leverPlan, type LeverPlan } from '../intelligence/leversPlan';
import type { Levers } from '../intelligence/levers';
import type { PeriodWaterfall } from '../intelligence/waterfall';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', AMBER = '#b45309';

export interface LeversPaperIn { line: string; printed: string; unit: string; constraint?: string; fall: PeriodWaterfall; levers: Levers; weeks: number }

export function leversBlocks(plan: LeverPlan, o: Pick<LeversPaperIn, 'line' | 'printed' | 'constraint' | 'weeks' | 'unit'>): Block[] {
  const out: Block[] = [
    text({ text: `${o.line} · printed ${o.printed}`, size: SIZE.small, colour: MUTED, after: 2 }),
    heading('Recovery levers — what taking a share off the top losses buys', plan.sentence),
  ];
  if (!plan.rows.length) {
    out.push(text({ text: 'No loss has been taken down yet. Slide a loss down on the line’s capacity page to see what it gives back, then print the plan.', colour: INK2 }));
  } else {
    out.push(label('The levers chosen'));
    plan.lines.forEach(l => out.push(text({ text: l, size: SIZE.small, colour: INK2, bullet: '•', indent: 10, after: 3 })));
    out.push(label('Where it is held'));
    out.push(text({ text: `${o.constraint ? `The line is held at the ${o.constraint}: only minutes recovered there come back as ${o.unit}.` : 'Where the line is held is not known — work out its Line capacity to say which losses cost output.'} A minute recovered anywhere else is a minute, and no more ${o.unit}; the idle labour is said apart, never summed with the contribution.`, size: SIZE.small, colour: INK2 }));
    if (plan.prize) out.push(text({ text: `The most to gain at the constraint is ${plan.prize.label.toLowerCase()}${plan.prize.asset ? ` on the ${plan.prize.asset}` : ''}: ${Number(plan.prize.perShift.toFixed(1))} min a shift.`, size: SIZE.small, colour: INK2 }));
  }
  out.push(label('How it is known'));
  out.push(text({ text: `${plan.basis} (the last ${o.weeks} weeks). A share is a what-if, not a promise: the minutes come back only if the cause is fixed, and a recovered minute at the constraint is output only if there is demand for it and the line is not held somewhere else next.`, size: SIZE.small, colour: INK2 }));
  plan.missing.forEach(m => out.push(text({ text: m, size: SIZE.small, colour: AMBER })));
  return out;
}

/** Draw the plan on a page of its own (more if it needs them). */
export async function drawLeversPaper(doc: jsPDF, x: LeversPaperIn): Promise<void> {
  const plan = leverPlan(x.fall, x.levers, { unit: x.unit, line: x.line });
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const build = () => leversBlocks(plan, x);
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`Recovery levers · ${x.line} · printed ${x.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

/** Made and handed over: saved to the device, the bar offering Open and Send. */
export async function saveLeversPdf(x: LeversPaperIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { todayISO } = await import('../weeks');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `Recovery levers — ${x.line}`);
  await drawLeversPaper(doc, x);
  await deliverPdf(doc, pdfFileName(x.line, 'recovery levers', todayISO()));
}
