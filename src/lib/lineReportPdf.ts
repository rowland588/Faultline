/* A LINE ON PAPER — the line report, one A4 page (docs/BLUEPRINT.md §3 and
 * Stage 3: "Paper: the line report, one page"). The lean page
 * (docs/LEAN-PAGE.md): the band, the tiles and the closing line the line's
 * page says (lib/lineLean); then the problems open on it (late first, in red), its machines in flow order, the programs still to prove,
 * what each tool's latest found, and the jobs on it with their verdicts.
 *
 * One page: every list is cut to what fits and says how many more and where
 * they are ("and 4 more — the line's Problems report"), so a big line stays
 * one sheet. Laid out by the report engine (src/lib/report/). */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { font, gap, rows, text, wrap } from './report/blocks';
import { leanBand, leanClosing, leanHead, leanTiles } from './report/lean';
import { bandPage, type LeanTone } from './lean';
import { lineClosing, lineTiles, type LineReading } from './lineLean';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#475569', MUTED = '#64748b', LINE = '#e6eaf0';
type ReadyTone = 'g' | 'a' | 'r' | 'w' | 'n';
const TONE: Record<ReadyTone, string> = { g: '#15803d', a: '#b45309', r: '#c4281c', w: '#6d28d9', n: '#6b7588' };

export interface LineReportRow { what: string; meta: string; right: string; tone: ReadyTone }
export interface LineReport {
  name: string;
  client?: string;
  site?: string;
  actions?: LineReportRow[];
  result?: { text: string; tone: LeanTone };
  type?: string;
  /** A dual line's lines, or the dual line this one is part of (lib/lines dualSaid): ["Made of", "Line 2a + line 2b"]. */
  dual?: [string, string];
  printed: string;
  reading: LineReading;
  /** The line's problems as rows, priority order, late in red. */
  problems: LineReportRow[];
  /** Its machines in flow order, each with who made it (lib/lineRecords lineKit flow). */
  machines: string;
  /** Its programs not proved yet, the late first. */
  programs: LineReportRow[];
  /** What each tool's latest found on it, as its page says it. */
  tools: { label: string; says: string; tone?: string }[];
  jobs: { name: string; method: string; verdict?: string; tone?: string }[];
}

const toneOf = (t?: string): ReadyTone => (t === 'r' || t === 'a' || t === 'g' || t === 'w' ? t : 'n');
const CAP = { problems: 6, programs: 5, tools: 5 };

/** A list of rows — what, its meta under it, a word on the right in its colour. */
export function listRows(list: LineReportRow[], cap: number, more: (n: number) => string): Block[] {
  const shown = list.slice(0, cap);
  const rightW = 130;
  const parts = (f: Frame, x: LineReportRow) => ({ what: wrap(f.doc, x.what, f.w - rightW - 8, 9, 'bold').slice(0, 2), meta: wrap(f.doc, x.meta, f.w - rightW - 8, 8).slice(0, 1) });
  const out: Block[] = [rows({
    rows: shown.map(x => ({
      h: (f: Frame) => { const p = parts(f, x); return 6 + p.what.length * 11 + p.meta.length * 10; },
      draw: (f: Frame, top: number) => {
        const p = parts(f, x);
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, top, f.x + f.w, top);
        font(f.doc, 9, 'bold', INK2); f.doc.text(p.what, f.x, top + 11);
        if (p.meta.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.meta, f.x, top + 11 + p.what.length * 11 - 1); }
        font(f.doc, 8.5, x.tone === 'n' ? 'normal' : 'bold', TONE[x.tone]); f.doc.text(wrap(f.doc, x.right, rightW, 8.5)[0] ?? '', f.x + f.w, top + 11, { align: 'right' });
      },
    })),
    after: list.length > cap ? 's' : 'm',
  })];
  if (list.length > cap) out.push(text({ text: more(list.length - cap), size: 8, colour: MUTED, after: 8 }));
  return out;
}

function blocksOf(r: LineReport, d: Density): Block[] {
  const out: Block[] = [];
  const page = bandPage(`PRODUCTION LINE${r.type ? ` · ${r.type.toUpperCase()}` : ''} · SUMMARY`, { name: r.name }, undefined, undefined,
    [...(r.dual ? [r.dual] : []), ['Projects on it', String(r.jobs.length)], ['Machines', r.machines ? String(r.machines.split(' → ').length) : '0'], ...(r.reading.looking ? [['Last looked at', r.reading.looking.fact] as [string, string]] : [])]);
  const c = lineClosing(r.reading);
  const attention = r.actions?.some(a => a.tone === 'r') ? 'r' : c.tone;
  out.push(leanBand({ ...page, verdict: { text: attention === 'r' ? 'Needs attention' : attention === 'a' ? 'Gaps to close' : 'Recorded position', tone: attention === 'g' ? 'n' : attention } }, r.printed));
  if (r.client || r.site) out.push(text({ text: [r.client, r.site].filter(Boolean).join(' · '), size: 9, style: 'bold', colour: INK2, after: 6 }));
  out.push(leanTiles(lineTiles(r.reading)));
  out.push(text({ text: 'Daily margin describes the line, not savings achieved by this investigation.', size: 8, colour: MUTED, after: 6 }));

  /* HOW FRESH THE LOOKING IS (FC-199) — one sentence and what the looking found, under the tiles; never a tile */
  if (r.reading.looking) {
    out.push(text({ text: r.reading.looking.says, size: 9, style: 'bold', colour: /stale/.test(r.reading.looking.says) ? TONE.r : /fading/.test(r.reading.looking.says) ? TONE.a : INK2, after: 2 }));
    out.push(text({ text: r.reading.looking.more, size: 8, colour: MUTED, after: gap(d, 'm') }));
  }

  /* A PROVED FIX OFFERED ACROSS THE LINES (FC-155) — each fix proved here with where it stands, and each offered to this line */
  for (const x of r.reading.spread ?? []) out.push(text({ text: x, size: 8.5, colour: INK2, after: 3 }));

  /* THE PROBLEMS OPEN ON IT — priority order, the late in red. */
  /* PLAIN HEADINGS FOR THE CUSTOMER (16 November, docs/NAV.md N4): what is wrong, what is being proved, what we measured, what is being done */
  out.push(leanHead('What is wrong', r.problems.length ? `${r.problems.length} open` : undefined));
  if (!r.problems.length) out.push(text({ text: `No problems logged on this line.${r.reading.stops.minutes ? ` ${r.reading.stops.minutes} minutes of stops were measured in the last four weeks.` : ''}`, size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else out.push(...listRows(r.problems, CAP.problems, n => `and ${n} more in the full report`));

  /* ITS MACHINES, AND THE PROGRAMS STILL TO PROVE. */
  out.push(leanHead('What is being proved', r.reading.programs.n ? `${r.reading.programs.proved} of ${r.reading.programs.n} programs proved` : undefined));
  out.push(text({ text: r.machines || 'No machines listed yet.', size: 8.5, colour: r.machines ? INK2 : MUTED, after: gap(d, 's') }));
  if (r.programs.length) out.push(...listRows(r.programs, CAP.programs, n => `and ${n} more in the full report`));
  else out.push(text({ text: r.reading.programs.n ? 'Every program on it proved.' : 'No program planned on it.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));

  /* WHAT ITS TOOLS FOUND — each tool's latest, in its own words. */
  if (r.tools.length) {
    out.push(leanHead('What we measured'));
    out.push(...listRows(r.tools.map(t => ({ what: t.label, meta: t.says, right: '', tone: toneOf(t.tone) })), CAP.tools, n => `and ${n} more in the full report`));
  }

  /* THE JOBS ON IT — each with the control room's verdict. */
  out.push(leanHead('What is being done'));
  if (r.actions?.length) out.push(...listRows(r.actions, 3, n => `and ${n} more actions in the line's Action tracker`));
  if (!r.jobs.length && !r.actions?.length) out.push(text({ text: 'No improvement project on this line now.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else if (!r.actions?.length) out.push(...listRows(r.jobs.map(j => ({ what: j.name, meta: j.method, right: j.verdict ?? '', tone: toneOf(j.tone) })), 6, n => `and ${n} more in the full report`));

  out.push(leanClosing(r.result ?? { text: 'Improvement results are recorded in the line’s Action tracker; daily margin is not a verified saving.', tone: 'n' }));
  return out;
}

/** Draw the line report into `doc`. One page: the lists are cut to fit. */
export async function drawLineReport(doc: jsPDF, r: LineReport): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, dd => blocksOf(r, dd));
  await pour({ ...base, density, dry: false }, blocksOf(r, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`${r.name} — summary  ·  ${r.printed}  ·  everything on the line is in its full report`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

export type { LeanTone };
