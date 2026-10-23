/* THE JOURNEY ON PAPER — the project between two dates, day by day
 * (docs/JOURNEY.md, J3). Rowland, 23 October: "pick a range ... make a PDF
 * and send it within that range, and change my ranges."
 *
 * The lean page on paper (lib/report/lean): the band with the project and
 * the range, the tiles (done · still to do · late · planned), the tools we
 * are using, then the days in order — each day's lines in the record's own
 * words and the day's colour, the commentary as written — and the closing
 * line. Read from the same module as the page (lib/journey), so the two
 * never part; laid out by the report engine, as many pages as the range
 * needs, every page footed with the project and the range. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block, type Density, type Frame } from '../../lib/report/flow';
import { font, gap, rows, text, wrap } from '../../lib/report/blocks';
import { leanBand, leanClosing, leanHead, leanTiles } from '../../lib/report/lean';
import { bandPage } from '../../lib/lean';
import { BLUE, DANGER, INK2, MUTED, OK, WARN, LINE as RULE } from '../../lib/reportKit';
import { daysOf, journeyClosing, journeyTiles, rangeLabel, type Journey, type JourneyTone, type ToolPlan } from './journey';
import { niceDay } from '../../lib/weeks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const TONE: Record<JourneyTone, string> = { done: OK, bad: DANGER, slipped: DANGER, asking: WARN, found: INK2, booked: BLUE, problem: WARN };

export interface JourneyPaper {
  project: string;
  printed: string;
  today: string;
  journey: Journey;
  plans: ToolPlan[];
}

/** A day's lines — what, in the day's colour; its kind and what was written under it. */
function dayRows(lines: Journey['days'][number]['lines']): Block {
  return rows({
    rows: lines.map(l => {
      const meta = [l.kind, l.detail].filter(Boolean).join(' · ');
      const parts = (f: Frame) => ({ what: wrap(f.doc, l.text, f.w - 12, 9, 'bold'), meta: meta ? wrap(f.doc, meta, f.w - 12, 8) : [] });
      return {
        h: (f: Frame) => { const p = parts(f); return 5 + p.what.length * 11 + p.meta.length * 10; },
        draw: (f: Frame, top: number) => {
          const p = parts(f);
          /* the line's colour at its left edge, as on the page; the words in graphite but for the abnormal */
          f.doc.setDrawColor(TONE[l.tone]); f.doc.setLineWidth(2); f.doc.line(f.x + 1, top + 3, f.x + 1, top + 3 + p.what.length * 11 + p.meta.length * 10 - 2);
          font(f.doc, 9, 'bold', l.tone === 'bad' || l.tone === 'slipped' ? DANGER : l.tone === 'problem' || l.tone === 'asking' ? WARN : INK2);
          f.doc.text(p.what, f.x + 10, top + 11);
          if (p.meta.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.meta, f.x + 10, top + 11 + p.what.length * 11 - 1); }
        },
      };
    }),
    after: 's',
  });
}

/** The tools we are using — a row a plan: the tool, what for, who, when, done. */
function planRows(plans: ToolPlan[]): Block {
  const rightW = 110;
  return rows({
    rows: plans.map(p => {
      const parts = (f: Frame) => ({ name: wrap(f.doc, p.name, f.w - rightW - 8, 9, 'bold'), what: p.what ? wrap(f.doc, `${p.what}${p.who ? ` — ${p.who}` : ''}`, f.w - rightW - 8, 8.5) : [] });
      return {
        h: (f: Frame) => { const x = parts(f); return 6 + x.name.length * 11 + x.what.length * 10.5; },
        draw: (f: Frame, top: number) => {
          const x = parts(f);
          f.doc.setDrawColor(RULE); f.doc.setLineWidth(0.5); f.doc.line(f.x, top, f.x + f.w, top);
          font(f.doc, 9, 'bold', INK2); f.doc.text(x.name, f.x, top + 11);
          if (x.what.length) { font(f.doc, 8.5, 'normal', INK2); f.doc.text(x.what, f.x, top + 11 + x.name.length * 11 - 1); }
          const when = p.done ? `done${p.doneOn ? ` ${niceDay(p.doneOn)}` : ''}` : p.due ? `planned ${niceDay(p.due)}` : 'no day yet';
          font(f.doc, 8.5, p.done ? 'bold' : 'normal', p.done ? OK : MUTED); f.doc.text(when, f.x + f.w, top + 11, { align: 'right' });
        },
      };
    }),
    after: 'm',
  });
}

function blocksOf(p: JourneyPaper, d: Density): Block[] {
  const j = p.journey;
  const c = journeyClosing(j, p.project, p.today);
  const range = rangeLabel(j.range, p.today);
  /* the closing line's counts on the band, the name once (the band's title is the name) */
  const page = bandPage('THE JOURNEY · WHAT WE DID, WHAT WE ARE DOING NEXT', { name: p.project }, c.text.startsWith(`${p.project}, `) ? c.text.slice(p.project.length + 2) : c.text, c.tone,
    [['Range', range], ['Days', `${daysOf(j.range).length} · ${j.days.length} with something`]]);
  const out: Block[] = [leanBand(page, p.printed), leanTiles(journeyTiles(j, p.today))];

  out.push(leanHead('The tools we are using', p.plans.length ? `${p.plans.length} planned` : undefined));
  if (!p.plans.length) out.push(text({ text: 'No tool ticked yet — the journey page ticks them, with what for and when.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else out.push(planRows(p.plans));

  if (!j.days.length) out.push(text({ text: `Nothing recorded between these dates${j.skipped ? ` — ${j.skipped} days, nothing on any of them` : ''}.`, size: 9, colour: MUTED, after: gap(d, 'm') }));
  for (const day of j.days) {
    const aside = day.lines.length ? `${day.lines.length} ${day.past ? 'recorded' : day.today ? 'today' : 'due'}` : undefined;
    out.push({ ...leanHead(`${day.label}${day.today ? ' · today' : ''}`, aside), keepWithNext: true });
    if (day.lines.length) out.push(dayRows(day.lines));
    for (const n of day.commentary) {
      out.push({ ...text({ text: 'COMMENTARY', size: 7.5, style: 'bold', colour: MUTED, after: 1 }), keepWithNext: true });
      out.push(text({ text: n.what, size: 9.5, colour: INK2, after: gap(d, 's') }));
    }
    if (!day.lines.length && !day.commentary.length) out.push(text({ text: 'Nothing logged yet today.', size: 8.5, colour: MUTED, after: gap(d, 's') }));
  }
  if (j.days.length && j.skipped) out.push(text({ text: `${j.skipped} ${j.skipped === 1 ? 'day' : 'days'} with nothing recorded, not shown.`, size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  out.push(leanClosing(c));
  return out;
}

/** Draw the journey into `doc` — as many pages as the range needs. */
export async function drawJourney(doc: jsPDF, p: JourneyPaper): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(p, d));
  await pour({ ...base, density, dry: false }, blocksOf(p, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  const foot = `${p.project} — the journey, ${rangeLabel(p.journey.range, p.today)}  ·  ${p.printed}`;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(wrap(doc, foot, CW - 60, 7.5)[0] ?? '', M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

/** Made and handed over: saved to the device, the bar offering Open and Send. */
export async function saveJourneyPdf(p: JourneyPaper): Promise<'downloaded' | 'shared' | 'opened'> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../../lib/savePdf');
  const { pdfFileName } = await import('../../lib/fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `${p.project} — the journey, ${rangeLabel(p.journey.range, p.today)}`);
  await drawJourney(doc, p);
  return deliverPdf(doc, pdfFileName(p.project, `journey ${p.journey.range.from} to ${p.journey.range.to}`, p.today)) as Promise<'downloaded' | 'shared' | 'opened'>;
}
