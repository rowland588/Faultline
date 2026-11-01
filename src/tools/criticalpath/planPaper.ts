/* THE CRITICAL PATH ON PAPER — "Critical path — the plan's chain of waits" (FC-215 part 2; knowledge/specs/FC-215-critical-path.md, Part 2, The report).
 *
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md) from the SAME reading the page draws (./plan): the band, the tiles, the
 * sentence, the plan as it can run, machine by machine, the steps left with their floats and what each waits for (and whose word that
 * is), what was left out, the money, what it does not say, and the closing line. Nothing here is a second reading. */
import type { jsPDF } from 'jspdf';
import { INK2, MUTED } from '../../lib/reportKit';
import { codeHeader } from '../../lib/report/codeHeader';
import { leanClosing, leanHead, leanTiles } from '../../lib/report/lean';
import { pictureBlock, table } from '../../lib/report/calcPaper';
import { chooseDensity, pour, type Block, type Density } from '../../lib/report/flow';
import { font, gap, text } from '../../lib/report/blocks';
import { niceDay } from '../../lib/weeks';
import { plural } from '../../lib/format';
import { pdfFileName } from '../../lib/fileName';
import {
  GATE_WORD, marginSays, planCaveats, planClosing, planPicture, planSays, planTiles, type PlanMoney, type PlanReading, type PlanRow,
} from './plan';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const BRAND = '#0c7489';
const dayWord = (n: number): string => `${n} ${n === 1 ? 'day' : 'days'}`;

export interface PlanPaperInput { name: string; lead?: string; reading: PlanReading; money: PlanMoney; watch: number; projectId?: string; link?: string }

const waitsOf = (s: PlanRow): string => {
  const live = s.waits.filter(w => !w.done);
  return live.length ? live.map(w => w.label).join(', ') : s.waits.length ? 'nothing left' : 'the beginning';
};

/** The blocks, from the reading — exported for the acceptance script's read-back and the tests. */
export function planPaperBlocks(p: PlanPaperInput, d: Density): Block[] {
  const x = p.reading;
  const out: Block[] = [];
  out.push(...codeHeader({
    eyebrow: 'CRITICAL PATH · STAGE GATE', title: p.name, colour: BRAND, ...(p.link ? { link: p.link } : {}),
    line: [p.lead ? `Led by ${p.lead}` : '', `Worked out from ${niceDay(x.today)}`, `Printed ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`].filter(Boolean).join('   ·   '),
  }, d));
  out.push(leanTiles(planTiles(x, p.money, p.watch)));
  out.push(text({ text: planSays(x), size: 10, style: 'bold', colour: INK2, after: 3 }));
  out.push(text({ text: marginSays(x), size: 9, colour: INK2, after: 3 }));
  for (const n of x.notes) out.push(text({ text: n, size: 8.5, colour: MUTED, after: 2 }));

  const pic = planPicture(x);
  out.push(leanHead(pic.title));
  out.push(pictureBlock(pic));
  out.push(text({ text: pic.caption, size: 8, colour: MUTED, after: gap(d, 'm') }));

  out.push(leanHead('Machine by machine'));
  out.push(table(['Machine', 'What its chain does', 'Steps left'], x.machines.map(m => [
    m.name,
    m.critical ? 'Critical — a day lost on a critical step is a day later at the handover' : `${dayWord(m.float)} of float`,
    `${m.left}${m.done ? ` (${m.done} done)` : ''}`,
  ]), [0.26, 0.54, 0.2]));

  out.push(leanHead(`What is left — ${plural(x.todo.length, 'step')}`));
  out.push(table(['Step', 'Days', 'Early start – finish', 'Float', 'Waits for', 'Whose word'], x.todo.map(s => [
    `${GATE_WORD[s.node.gate]}: ${s.node.label}`,
    s.days === 0 ? 'none left' : String(s.days),
    s.days === 0 ? '—' : `${niceDay(s.startOn)} – ${niceDay(s.endOn)}`,
    s.critical && s.days > 0 ? 'critical' : dayWord(s.float),
    waitsOf(s),
    s.node.gate === 'arrival' ? 'due date' : s.told ? 'the owner’s' : 'the plan’s order',
  ]), [0.27, 0.08, 0.17, 0.1, 0.25, 0.13]));
  if (x.left.length) out.push(text({ text: `Left out of the chain: ${x.left.map(l => `${l.label} (${l.why})`).join('; ')}.`, size: 8.5, colour: MUTED, after: gap(d, 'm') }));

  out.push(leanHead('In money'));
  out.push(text({ text: p.money.says, size: 9, style: 'bold', colour: INK2, after: gap(d, 'm') }));

  out.push(leanHead('What this does not say'));
  for (const c of planCaveats(x)) out.push(text({ text: c, size: 8.5, colour: INK2, indent: 10, bullet: '·', after: 2 }));
  out.push(leanClosing(planClosing(x, p.watch)));
  return out;
}

/** Draw the paper into `doc`. */
export async function drawPlanPaper(doc: jsPDF, p: PlanPaperInput): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => planPaperBlocks(p, d));
  await pour({ ...base, density, dry: false }, planPaperBlocks(p, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`${p.name}  ·  critical path  ·  ${niceDay(p.reading.today)}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

/** Make the paper and put it in the person's hands (downloaded first; Open and Send from the bar). */
export async function savePlanPaper(p: PlanPaperInput): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../../lib/savePdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `${p.name} — critical path`);
  await drawPlanPaper(doc, { ...p, ...(p.projectId && !p.link ? { link: `${location.origin}${location.pathname}#/calc/critical-path?project=${p.projectId}` } : {}) });
  await deliverPdf(doc, pdfFileName(p.name, 'critical path', p.reading.today));
}
