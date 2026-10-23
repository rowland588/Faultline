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
const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6';
type ReadyTone = 'g' | 'a' | 'r' | 'w' | 'n';
const TONE: Record<ReadyTone, string> = { g: '#15803d', a: '#b45309', r: '#c4281c', w: '#6d28d9', n: '#6b7588' };

export interface LineReportRow { what: string; meta: string; right: string; tone: ReadyTone }
export interface LineReport {
  name: string;
  type?: string;
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
const CAP = { problems: 6, programs: 5, tools: 9 };

/** A list of rows — what, its meta under it, a word on the right in its colour. */
function listRows(list: LineReportRow[], cap: number, more: (n: number) => string): Block[] {
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
  const page = bandPage(`PRODUCTION LINE${r.type ? ` · ${r.type.toUpperCase()}` : ''} · THE LINE REPORT`, { name: r.name }, undefined, undefined,
    [['Projects on it', String(r.jobs.length)], ['Machines', r.machines ? String(r.machines.split(' → ').length) : '0']]);
  const c = lineClosing(r.reading);
  out.push(leanBand({ ...page, verdict: { text: c.tone === 'r' ? 'Needs you' : c.tone === 'a' ? 'Gaps to close' : 'In hand', tone: c.tone } }, r.printed));
  out.push(leanTiles(lineTiles(r.reading)));

  /* THE PROBLEMS OPEN ON IT — priority order, the late in red. */
  out.push(leanHead('Problems open', r.problems.length ? `${r.problems.length} open` : undefined));
  if (!r.problems.length) out.push(text({ text: 'Nothing open on this line.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else out.push(...listRows(r.problems, CAP.problems, n => `and ${n} more — the line's Problems report has every one`));

  /* ITS MACHINES, AND THE PROGRAMS STILL TO PROVE. */
  out.push(leanHead('Machines and programs', r.reading.programs.n ? `${r.reading.programs.proved} of ${r.reading.programs.n} programs proved` : undefined));
  out.push(text({ text: r.machines || 'No machines listed yet.', size: 8.5, colour: r.machines ? INK2 : MUTED, after: gap(d, 's') }));
  if (r.programs.length) out.push(...listRows(r.programs, CAP.programs, n => `and ${n} more — the line's programs report has every one`));
  else out.push(text({ text: r.reading.programs.n ? 'Every program on it proved.' : 'No program planned on it.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));

  /* WHAT ITS TOOLS FOUND — each tool's latest, in its own words. */
  if (r.tools.length) {
    out.push(leanHead('What its tools found'));
    out.push(...listRows(r.tools.map(t => ({ what: t.label, meta: t.says, right: '', tone: toneOf(t.tone) })), CAP.tools, n => `and ${n} more`));
  }

  /* THE JOBS ON IT — each with the control room's verdict. */
  out.push(leanHead('Projects on it'));
  if (!r.jobs.length) out.push(text({ text: 'No project on this line now — its problems and its tools need none.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else out.push(...listRows(r.jobs.map(j => ({ what: j.name, meta: j.method, right: j.verdict ?? '', tone: toneOf(j.tone) })), 6, n => `and ${n} more — the control room report`));

  out.push(leanClosing(c));
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
    doc.text(`${r.name} — the line report  ·  ${r.printed}  ·  its Problems and programs reports have every row`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

export type { LeanTone };
