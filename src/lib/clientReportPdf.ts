/* THE CLIENT REPORT, ON PAPER — A4, portrait, in the order the job is run.
 * See lib/clientReport.ts for what is on it and why. This only draws. */
import type { jsPDF } from 'jspdf';
import type { ClientReport, CellTone, FixRow, StepAccount } from './clientReport';
import { GATE_TONE_WORD, type GateTone } from './install';
import type { OnTargetTone } from './onTarget';
import type { Shot } from './testReport';
import { brandedAlready, san } from './reportKit';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, heading, label, pagesOf, rows, space, text, wrap } from './report/blocks';
import { byStage, gantt, withMachines, withNext, type GanttBy } from './gantt';
import { drawGantt } from './ganttPdf';
import { programsBlocks } from './programsReportPdf';
import { moveLines } from './story';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef';
/* The app's own state colours, so paper and screen say the same thing in the
   same colour: one red (the day has gone), one amber (waiting), one indigo
   (under way, still ahead), one green (done — and quiet). */
const BRAND = '#1f63e0', SHELL = '#0d1f3c', OK = '#1e6b4b', DANGER = '#9b3227', AMBER = '#8a5f14', BOOKED = '#4f46b8';
const DONE_WASH = '#e3efe9';

/* Late and a problem said apart — Rowland, 6 October: never "late or a
   problem" (lib/install lateOrProblem). A test that did not pass is solid red. */
const GATE_COLOUR: Record<GateTone, { fill?: string; stroke: string; text: string; word: string }> = {
  done: { fill: DONE_WASH, stroke: OK, text: OK, word: GATE_TONE_WORD.done },
  going: { fill: '#eeedfa', stroke: BOOKED, text: BOOKED, word: GATE_TONE_WORD.going },
  late: { fill: '#fdf2f0', stroke: DANGER, text: DANGER, word: GATE_TONE_WORD.late },
  problem: { fill: '#f7eedb', stroke: AMBER, text: AMBER, word: GATE_TONE_WORD.problem },
  failed: { fill: DANGER, stroke: DANGER, text: '#ffffff', word: GATE_TONE_WORD.failed },
  ahead: { stroke: '#b8c4d6', text: INK2, word: GATE_TONE_WORD.ahead },
  none: { stroke: '#d5dde8', text: MUTED, word: GATE_TONE_WORD.none },
};
/* ARE WE ON TARGET? — the box at the top of the first page, in the state's
   own colour: red behind, amber at risk, a quiet green on target, grey. */
const ON_TARGET: Record<OnTargetTone, { fill: string; stroke: string; text: string }> = {
  behind: { fill: '#fdf2f0', stroke: DANGER, text: DANGER },
  risk: { fill: '#f7eedb', stroke: AMBER, text: AMBER },
  on: { fill: '#eef6f1', stroke: '#9cc4af', text: OK },
  none: { fill: '#f4f6fa', stroke: '#c6d2e3', text: MUTED },
};
const CELL_COLOUR: Record<CellTone, { fill?: string; stroke: string }> = {
  done: { fill: DONE_WASH, stroke: OK },
  /* A problem that lost no time — amber, waiting on something, not late. */
  problem: { fill: AMBER, stroke: AMBER },
  late: { fill: '#fdf2f0', stroke: DANGER },
  asking: { fill: '#fff7e6', stroke: AMBER },
  booked: { fill: '#eeedfa', stroke: BOOKED },
  ahead: { stroke: '#b8c4d6' },
  none: { stroke: '#e3e9f1' },
};
const FIX_COLOUR: Record<string, string> = { late: DANGER, notRun: DANGER, soon: AMBER, ahead: BOOKED, done: OK };

export interface ClientReportExtras {
  /** A picture per fix id: its frame on the line with the dot, or its photo. */
  shots: Map<string, Shot>;
  /** Draws the line standard pages; called once, on a fresh landscape page. */
  standards?: (doc: jsPDF) => Promise<void>;
  /** How the plan page is grouped — the way the plan is drawn on this
   *  device's screen (lib/gantt ganttBy). By machine unless said. */
  planBy?: GanttBy;
}

/** Every string in the report through the one door the other PDFs use. The
 *  built-in font has no arrows: "Changeover 2kg → 1.25kg" printed as
 *  "Changeover 2kg !' 1.25kg" on the client's copy. */
function sanAll<T>(v: T): T {
  if (typeof v === 'string') return san(v) as T;
  if (Array.isArray(v)) return v.map(sanAll) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sanAll(x)])) as T;
  return v;
}

export async function drawClientReport(doc: jsPDF, report: ClientReport, extras: ClientReportExtras): Promise<void> {
  const r = sanAll(report);
  /* POURED, NOT PLACED — docs/REPORTS.md. Every part below is a block that
     measures itself; lib/report/flow decides the pages. Nothing is capped,
     nothing is given a height it might not fit in, a gate with nothing kept
     is not printed as a heading saying so, and a small overflow is absorbed
     by the compact density rather than a near-empty page. */
  let planPages: number[] = [];
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(r, extras, d, p => { planPages = p; }));
  await pour({ ...base, density, dry: false }, blocksOf(r, extras, density, p => { planPages = p; }), () => doc.addPage('a4', 'portrait'));

  /* ---- the foot of every page ---- */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    if (pw > ph && !planPages.includes(i)) continue;   // a line standard page carries its own foot
    font(doc, 7.5, 'normal', MUTED);
    const num = `${i} of ${pages}`;
    const room = pw - 2 * M - doc.getTextWidth(num) - 16;
    doc.text(fitLine(doc, `${r.name}  ·  client report  ·  ${r.printed}`, room), M, ph - 18);
    doc.text(num, pw - M, ph - 18, { align: 'right' });
  }
}

/** One line that fits, shortened at a word with "…" — for a running footer
 *  only, where the full name is on page 1. */
function fitLine(doc: jsPDF, t: string, w: number): string {
  if (doc.getTextWidth(t) <= w) return t;
  const words = t.split(' ');
  while (words.length > 1 && doc.getTextWidth(words.join(' ') + '…') > w) words.pop();
  return words.join(' ') + '…';
}

const pillPath = (doc: jsPDF, x: number, py: number, w: number, h: number, tone: GateTone, text: string) => {
  const c = GATE_COLOUR[tone];
  doc.setLineWidth(tone === 'none' ? 0.6 : 0.9);
  if (tone === 'none') doc.setLineDashPattern([2, 1.5], 0); else doc.setLineDashPattern([], 0);
  doc.setDrawColor(c.stroke);
  if (c.fill) { doc.setFillColor(c.fill); doc.roundedRect(x, py, w, h, 3, 3, 'FD'); } else doc.roundedRect(x, py, w, h, 3, 3, 'S');
  doc.setLineDashPattern([], 0);
  font(doc, 7, 'bold', c.text);
  doc.text(text, x + w / 2, py + h / 2 + 2.4, { align: 'center' });
};

const cellPath = (doc: jsPDF, c: CellTone, x: number, y: number, w = 14, h = 10) => {
  const cc = CELL_COLOUR[c];
  /* Late is drawn heavier than done — the abnormal stands out. */
  doc.setDrawColor(cc.stroke); doc.setLineWidth(c === 'late' ? 1.8 : 0.9);
  if (c === 'none') doc.setLineDashPattern([1.5, 1.5], 0);
  if (cc.fill) { doc.setFillColor(cc.fill); doc.roundedRect(x, y, w, h, 2, 2, 'FD'); } else doc.roundedRect(x, y, w, h, 2, 2, 'S');
  doc.setLineDashPattern([], 0);
};

/* The key says the rule: late is the day gone OR hours lost; a problem lost
   none — the same words the plan's key prints. */
const KEY: [CellTone, string][] = [['late', 'late — or hours lost'], ['problem', 'a problem — no time lost'], ['asking', 'waiting on a verdict'], ['booked', 'still ahead'], ['ahead', 'no day yet'], ['done', 'done'], ['none', 'not added yet']];

/** The colour key, wrapping onto a second line when the page is narrow. */
function keyBlock(only: Set<CellTone>): Block {
  const items = KEY.filter(([t]) => only.has(t));
  const layout = (f: Frame) => {
    font(f.doc, SIZE.tiny, 'normal', MUTED);
    const placed: { t: CellTone; w: string; x: number; line: number }[] = [];
    let x = 0, line = 0;
    for (const [t, w] of items) {
      const span = 12 + f.doc.getTextWidth(w) + 10;
      if (x + span > f.w && x > 0) { x = 0; line++; }
      placed.push({ t, w, x, line }); x += span;
    }
    return { placed, lines: line + 1 };
  };
  return box(f => (items.length ? layout(f).lines * 12 + gap(f.density, 's') : 0), (f, y) => {
    const { placed } = layout(f);
    for (const p of placed) {
      cellPath(f.doc, p.t, f.x + p.x, y + 3 + p.line * 12, 9, 7);
      font(f.doc, SIZE.tiny, 'normal', MUTED);
      f.doc.text(p.w, f.x + p.x + 12, y + 9 + p.line * 12);
    }
  }, f => (items.length ? gap(f.density, 's') : 0));
}

/** THE LEAD'S COMMENTARY, under the answer on both reports — the one place
 *  on either that is somebody's own words rather than the records' (Project
 *  reportNote). Rowland, 9 October: "I need a way to add commentary." */
function commentaryBlocks(c: ClientReport['commentary'], d: Density): Block[] {
  if (!c) return [];
  return [
    { ...label('Commentary'), keepWithNext: true },
    { ...text({ text: c.text, size: 10, colour: INK2, after: 3 }), keepWithNext: true },
    text({ text: [c.by ? `— ${c.by}` : '', c.on ? `written ${c.on}` : ''].filter(Boolean).join(', '), size: 8.5, colour: MUTED, after: gap(d, 'l') }),
  ];
}

function blocksOf(r: ClientReport, extras: ClientReportExtras, d: Density, onPlan: (pages: number[]) => void): Block[] {
  const out: Block[] = [];
  const S = SIZE;

  /* ================================ 1 · WHERE THE JOB IS ================================ */
  out.push(text({ text: 'CLIENT REPORT · STAGE GATE', size: S.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: r.name, size: S.title, style: 'bold', after: 4 }));
  out.push(text({ text: [r.lead ? `Led by ${r.lead}` : '', `Printed ${r.printed}`, r.dates ?? ''].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));

  /* ARE WE ON TARGET? — the answer first, in a word in its colour, and why
     in words beside it (lib/onTarget): Rowland, 6 October, "the header must
     clearly show the answer to the question: ARE WE ON TARGET?" */
  const ot = r.onTarget;
  const otLines = (f: Frame) => {
    font(f.doc, 12.5, 'bold');
    const ww = f.doc.getTextWidth(`${ot.word} `);
    const reason = `— ${ot.reason}`;
    const first = wrap(f.doc, reason, f.w - 28 - ww, 9.5)[0] ?? '';
    const rest = reason.slice(first.length).trim();
    return { ww, first, rest: rest ? wrap(f.doc, rest, f.w - 28, 9.5) : [] };
  };
  const otH = (f: Frame) => 34 + otLines(f).rest.length * 12 + 6;
  out.push(box(f => otH(f) + gap(f.density, 'm'), (f, y) => {
    const l = otLines(f), c = ON_TARGET[ot.tone], h = otH(f);
    f.doc.setFillColor(c.fill); f.doc.setDrawColor(c.stroke); f.doc.setLineWidth(ot.tone === 'behind' ? 1.6 : 0.8);
    f.doc.roundedRect(f.x, y, f.w, h, 6, 6, 'FD');
    font(f.doc, 7.5, 'bold', MUTED); f.doc.text('ARE WE ON TARGET?', f.x + 14, y + 14);
    font(f.doc, 12.5, 'bold', c.text); f.doc.text(ot.word, f.x + 14, y + 30);
    font(f.doc, 9.5, 'normal', INK2); f.doc.text(l.first, f.x + 14 + l.ww, y + 30);
    if (l.rest.length) f.doc.text(l.rest, f.x + 14, y + 42);
  }, f => gap(f.density, 'm')));
  out.push(...commentaryBlocks(r.commentary, d));

  /* CRITICAL ISSUES — straight under the answer, before anything else
     (lib/critical). Rowland, 6 October: "say in a report — look at this, this
     is a major problem, potential solutions." Each open one told whole, in
     the problem's red: what, where and when, what it means for the business,
     the ways round it with the agreed one said so, its fix, how it stands.
     The sorted ones a line each, in plain ink — normal recedes. */
  /* HIGH RISKS follow, the same way in amber (lib/critical): not happened
     yet, the consequence if it does, and what it could cost — an estimate. */
  const tell = (set: typeof r.critical, title: string, tag: string, colour: string, story: string) => {
    if (!set.open.length && !set.sorted.length) return;
    out.push(label(`${title} · ${set.open.length} open${set.sorted.length ? ` · ${set.sorted.length} sorted` : ''}`, set.open.length ? colour : MUTED));
    /* THE HEADINGS STAND OUT. Rowland, 7 October: "could cost, ways round it —
       just plain looking; they need to stand out as well ... a different
       colour, even if it's a title." Each heading in the item's own colour —
       red under a critical issue, amber under a high risk — and the words
       under it in ink, so the eye finds each part of the story. */
    const head = (t: string) => ({ ...text({ text: t.toUpperCase(), size: 7.5, style: 'bold' as const, colour, indent: 10, after: 1 }), keepWithNext: true });
    set.open.forEach(c => {
      out.push({ ...text({ text: `${tag} — ${c.what}`, size: 10.5, style: 'bold', colour, after: 2 }), keepWithNext: true });
      out.push({ ...text({ text: c.meta, size: 8.5, colour: MUTED, after: 4 }), keepWithNext: true });
      if (c.could) {
        out.push(head('Could cost'));
        out.push(text({ text: c.could.replace(/^could cost /, ''), size: 9.5, style: 'bold', colour: INK2, indent: 10, after: 4 }));
      }
      out.push(head(story));
      out.push(text({ text: c.impact || 'Not written yet.', size: 9.5, colour: INK2, indent: 10, after: 4 }));
      out.push(head('Ways round it'));
      if (c.ways.length) {
        c.ways.forEach((w, k, all) => out.push(text({ text: w.agreed ? `${w.what} — agreed` : w.what, size: 9, style: w.agreed ? 'bold' : 'normal', colour: w.agreed ? OK : INK2, indent: 22, bullet: '•', after: k === all.length - 1 ? 4 : 1 })));
      } else out.push(text({ text: 'None written yet.', size: 9, colour: INK2, indent: 10, after: 4 }));
      if (c.fix) {
        out.push(head('The fix'));
        out.push(text({ text: c.fix.replace(/^Fix: /, ''), size: 9, colour: INK2, indent: 10, after: 4 }));
      }
      out.push(head('Now'));
      out.push(text({ text: c.state, size: 9, style: 'bold', colour: INK2, indent: 10, after: gap(d, 'm') }));
    });
    set.sorted.forEach((l, i, all) => out.push(text({ text: l, size: 9, colour: INK2, indent: 12, bullet: '•', after: i === all.length - 1 ? gap(d, 'm') : 1 })));
  };
  tell(r.critical, 'Critical issues', 'CRITICAL', DANGER, 'What it means for the business');
  tell(r.risks, 'High risks', 'HIGH RISK', AMBER, 'The consequence if it happens');

  // the sentence, on the dark band — as tall as its words
  const said = (f: Frame) => wrap(f.doc, r.sentence, f.w - 32, 14, 'bold');
  /* The answer above says the handover against the date agreed, both days
     named; the slip line ("The date has moved 8 days…") said it again here. */
  const slip = (f: Frame) => (r.slip && !r.onTarget ? wrap(f.doc, r.slip, f.w - 32, 9) : []);
  out.push(box(f => 30 + said(f).length * 17 + slip(f).length * 12 + 6 + gap(f.density, 'l'), (f, y) => {
    const l = said(f), sl = slip(f);
    const bandH = 30 + l.length * 17 + sl.length * 12 + 6;
    f.doc.setFillColor(SHELL); f.doc.roundedRect(f.x, y, f.w, bandH, 8, 8, 'F');
    font(f.doc, 7.5, 'bold', '#8fa3c4'); f.doc.text('WHERE THE JOB IS', f.x + 16, y + 16);
    font(f.doc, 14, 'bold', '#ffffff'); f.doc.text(l, f.x + 16, y + 34);
    if (sl.length) { font(f.doc, 9, 'normal', '#c9d4e6'); f.doc.text(sl, f.x + 16, y + 34 + l.length * 17); }
  }, f => gap(f.density, 'l')));

  // the four gates, for the whole job
  out.push(label('The four gates'));
  const gw = (f: Frame) => (f.w - 3 * 8) / 4;
  const gateLines = (f: Frame) => r.gates.map(g => wrap(f.doc, g.says || GATE_COLOUR[g.tone].word, gw(f) - 14, 8));
  out.push(box(f => 24 + Math.max(...gateLines(f).map(l => l.length), 1) * 10 + gap(f.density, 'l'), (f, y) => {
    const ls = gateLines(f);
    const h = 24 + Math.max(...ls.map(l => l.length), 1) * 10;
    r.gates.forEach((g, i) => {
      /* A tile is a wash — a test that did not pass is the late red's. */
      const x = f.x + i * (gw(f) + 8), c = GATE_COLOUR[g.tone === 'failed' ? 'late' : g.tone];
      f.doc.setDrawColor(c.stroke); f.doc.setLineWidth(1);
      if (c.fill && g.tone !== 'done') { f.doc.setFillColor(c.fill); f.doc.roundedRect(x, y, gw(f), h, 5, 5, 'FD'); }
      else if (g.tone === 'done') { f.doc.setFillColor('#e9f5ef'); f.doc.roundedRect(x, y, gw(f), h, 5, 5, 'FD'); }
      else f.doc.roundedRect(x, y, gw(f), h, 5, 5, 'S');
      font(f.doc, 11, 'bold', g.tone === 'done' ? OK : c.text === MUTED ? INK2 : c.text); f.doc.text(g.label, x + 7, y + 15);
      font(f.doc, 8, 'normal', INK2); f.doc.text(ls[i], x + 7, y + 27);
    });
  }, f => gap(f.density, 'l')));

  // where each machine is — one row per machine, as tall as its name
  if (r.machines.length) {
    const nameW = 140, atW = 70;
    const cellW = (f: Frame) => (f.w - nameW - atW - 4 * 4) / 4;
    const nameLines = (f: Frame, n: string) => wrap(f.doc, n, nameW - 8, 9.5, 'bold');
    out.push(label('Where each machine is'));
    out.push(rows({
      header: {
        h: () => 13,
        draw: (f, y) => {
          font(f.doc, 7, 'bold', MUTED);
          ['Install', 'Set up', 'Commission', 'Hand over'].forEach((g, i) => f.doc.text(g, f.x + nameW + i * (cellW(f) + 4) + cellW(f) / 2, y + 7, { align: 'center' }));
          f.doc.text('AT', f.x + f.w - atW + 4, y + 7);
        },
      },
      rows: r.machines.map(m => {
        /* WHAT IT WAS HANDED OVER WITH, under its gates (docs/HANDOVER.md) —
           the status, said: "with no test kept · 1 fix open". */
        const withLines = (f: Frame) => (m.with?.length ? wrap(f.doc, `with ${m.with.join(' · ')}`, f.w - nameW - 4, 8) : []);
        return {
          h: (f: Frame) => Math.max(20 + withLines(f).length * 10, 8 + nameLines(f, m.name).length * 11),
          draw: (f: Frame, y: number) => {
            f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
            font(f.doc, 9.5, 'bold'); f.doc.text(nameLines(f, m.name), f.x, y + 13);
            m.gates.forEach((t, i) => pillPath(f.doc, f.x + nameW + i * (cellW(f) + 4), y + 4, cellW(f), 13, t, GATE_COLOUR[t].word));
            font(f.doc, 9, 'bold', INK2); f.doc.text(wrap(f.doc, m.at, atW - 6, 9, 'bold'), f.x + f.w - atW + 4, y + 13);
            const wl = withLines(f);
            if (wl.length) { font(f.doc, 8, 'normal', AMBER); f.doc.text(wl, f.x + nameW, y + 27); }
          },
        };
      }),
    }));
  }

  /* ================================ 2 · GATE BY GATE ================================ */
  /* A GATE WITH NOTHING KEPT IS ONE LINE, NOT A SECTION. A job just started
     printed a heading per gate, each saying "nothing kept" — three of a
     page's sections telling the client nothing. They are named together. */
  const said2 = (s: ClientReport['sections'][number]) =>
    !!(s.grid?.rows.length || s.late.length || s.problems.length || s.failed?.length || s.accounts?.length || s.programs?.total || s.tests?.length);
  const quiet = r.sections.filter(s => !said2(s));
  for (const s of r.sections.filter(said2)) {
    out.push(heading(s.label, s.says));
    if (s.grid && s.grid.rows.length) {
      const nameW = 130, minCol = 46;
      /* Every stage, however many: the columns are broken into bands that
         fit the page — it used to drop whatever did not fit, silently. */
      const perBand = (f: Frame) => Math.max(1, Math.floor((f.w - nameW) / minCol));
      const grid = s.grid;
      const bands = (f: Frame) => {
        const n = perBand(f), cols = grid.columns, out2: number[][] = [];
        for (let i = 0; i < cols.length; i += n) out2.push(cols.slice(i, i + n).map((_, k) => i + k));
        return out2;
      };
      const used = new Set<CellTone>(grid.rows.flatMap(row => row.cells));
      // Measured once per frame width; the bands are fixed for a given page.
      const probe: Frame = { doc: null as unknown as jsPDF, x: 0, w: CW, top: 0, bottom: 0, density: d, dry: true };
      const bandCount = Math.ceil(grid.columns.length / perBand(probe));
      for (let b = 0; b < bandCount; b++) {
        const colsOf = (f: Frame) => bands(f)[b] ?? [];
        const colW = (f: Frame) => (f.w - nameW) / Math.max(1, colsOf(f).length);
        const heads = (f: Frame) => colsOf(f).map(c => wrap(f.doc, grid.columns[c], colW(f) - 6, 6.5, 'bold'));
        const nameLines = (f: Frame, n: string) => wrap(f.doc, n, nameW - 8, 8.5, 'bold');
        out.push(rows({
          header: {
            h: f => 8 + Math.max(...heads(f).map(h => h.length), 1) * 7.5,
            draw: (f, y) => {
              font(f.doc, 6.5, 'bold', MUTED);
              heads(f).forEach((h, i) => f.doc.text(h, f.x + nameW + i * colW(f) + colW(f) / 2, y + 7, { align: 'center' }));
            },
          },
          rows: grid.rows.map(row => ({
            h: f => Math.max(18, 7 + nameLines(f, row.machine).length * 10),
            draw: (f, y) => {
              f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
              font(f.doc, 8.5, 'bold'); f.doc.text(nameLines(f, row.machine), f.x, y + 12);
              colsOf(f).forEach((c, i) => cellPath(f.doc, row.cells[c] ?? 'none', f.x + nameW + i * colW(f) + colW(f) / 2 - 7, y + 4));
            },
          })),
          after: 's',
        }));
      }
      out.push(keyBlock(used));
    }

    /* LATE, THEN A PROBLEM — two lists, each in its colour and its words
       (lib/install lateOrProblem): late with the hours lost when there are
       any; a problem that lost no time apart, in amber. */
    if (s.late.length && s.gate !== 'commission') {
      out.push(text({ text: 'Late', size: S.small, style: 'bold', colour: DANGER, after: 3 }));
      s.late.forEach((l, i) => out.push(text({ text: l, size: 9, colour: INK2, indent: 12, bullet: '•', after: i === s.late.length - 1 ? gap(d, 's') : 1 })));
    }
    /* What was said to have FAILED (a part's status, lib/noted resultNow) —
       red, with what was seen. */
    if (s.failed?.length) {
      out.push(text({ text: 'Didn’t pass', size: S.small, style: 'bold', colour: DANGER, after: 3 }));
      s.failed.forEach((l, i, all) => out.push(text({ text: l, size: 9, colour: INK2, indent: 12, bullet: '•', after: i === all.length - 1 ? gap(d, 's') : 1 })));
    }
    if (s.problems.length) {
      out.push(text({ text: 'A problem — no time lost', size: S.small, style: 'bold', colour: AMBER, after: 3 }));
      s.problems.forEach((l, i, all) => out.push(text({ text: l, size: 9, colour: INK2, indent: 12, bullet: '•', after: i === all.length - 1 ? gap(d, 's') : 1 })));
    }

    /* HOURS LOST — under what is late, in the same neutral ink: hours are the
       work, and only a finish that moved is late (on the plan). */
    if (s.hours) {
      out.push(text({ text: s.hours.total, size: S.small, style: 'bold', colour: INK2, after: 3 }));
      s.hours.lines.forEach((l, i, all) => out.push(text({ text: l, size: 9, colour: INK2, indent: 12, bullet: '•', after: i === all.length - 1 ? gap(d, 's') : 1 })));
    }

    /* HOW EACH STAGE WENT — the team's account of every step that has one,
       under its "machine — stage", its day and its state in the grid's own
       colour and words. The account is a paragraph, so a long one wraps and
       breaks across a page between its lines; the line over it is never left
       at the foot of a page without it. */
    if (s.accounts?.length) {
      out.push(label(`How each stage went — ${s.label}`, INK2));
      s.accounts.forEach((a, i, all) => {
        out.push(accountHead(a));
        const last = i === all.length - 1 ? gap(d, 'm') : gap(d, 's') + 2;
        const more = !!(a.parts?.length || a.files);
        if (a.said) out.push(text({ text: a.said, size: 9, colour: INK2, indent: 12, after: more ? 2 : last }));
        /* Part of the plan (ui/StageParts): the stage's own lines, not problems. */
        a.parts?.forEach((pw, k, ps) => out.push(text({ text: pw, size: 9, colour: INK2, indent: 22, bullet: '•', after: k === ps.length - 1 && !a.files ? last : 1 })));
        /* Its files by name — "yes, here they are" (docs/PANELS.md). */
        if (a.files) out.push(text({ text: a.files, size: 9, colour: MUTED, indent: 12, after: last }));
      });
    }

    /* THE PROGRAMS — every one, machine by machine: its state in words and
       its colour, what was seen, what was said before (lib/programsReport).
       The rows the programs report prints, so the two cannot disagree. */
    if (s.programs && s.programs.total) {
      out.push(text({ text: `Programs — ${s.programs.says}`, size: S.h2, style: 'bold', before: 4, after: 4 }));
      out.push(...programsBlocks(s.programs, d));
    }

    /* THE PERFORMANCE RUNS — a row per product: what it netted against what
       was agreed, first in Commission — the numbers the line is accepted on
       (lib/run). Rowland, 7 October: "people ask how fast did we run, what
       did we net" — and "commissioning runs are multiple products." Only a
       figure that missed what was agreed is red; one that met it is green. */
    if (s.runs && s.runs.length) {
      out.push(text({ text: 'Performance runs', size: S.h2, style: 'bold', before: 4, after: 4 }));
      const nameW = 168, verdictW = 84;
      const cols = ['Net rate', 'Ran at', 'Rejects', 'Ran for'];
      const colW = (f: Frame) => (f.w - nameW - verdictW) / cols.length;
      const runParts = (f: Frame, r: NonNullable<typeof s.runs>[number]) => ({
        name: wrap(f.doc, r.product, nameW - 8, 9, 'bold'),
        sub: wrap(f.doc, [r.machine, r.title, r.when].filter(Boolean).join(' · '), nameW - 8, 8),
        agreed: wrap(f.doc, `Agreed: ${r.agreed}`, f.w - nameW - verdictW - 6, 8),
        say: r.say ? wrap(f.doc, `Short: ${r.say}`, f.w - nameW - verdictW - 6, 8, 'bold') : [],
      });
      out.push(rows({
        /* The column heads go with the rows onto a second page. */
        header: { h: () => 16, draw: (f, y) => {
          font(f.doc, 7, 'bold', MUTED);
          cols.forEach((c, i) => f.doc.text(c.toUpperCase(), f.x + nameW + i * colW(f), y + 11));
          f.doc.text('VERDICT', f.x + f.w - verdictW + 6, y + 11);
        } },
        rows: [
          ...s.runs.map(r => ({
            h: (f: Frame) => {
              const p = runParts(f, r);
              return 8 + Math.max(p.name.length * 11 + p.sub.length * 10, 28 + p.agreed.length * 10 + p.say.length * 10) + 6;
            },
            draw: (f: Frame, y: number) => {
              const p = runParts(f, r);
              f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
              font(f.doc, 9, 'bold'); f.doc.text(p.name, f.x, y + 13);
              font(f.doc, 8, 'normal', MUTED); f.doc.text(p.sub, f.x, y + 13 + p.name.length * 11);
              const figs: [string, 'met' | 'short' | ''][] = [[r.net, r.netTone], [r.speed, ''], [r.rejects, r.rejectsTone], [r.length, '']];
              figs.forEach(([v, tone], i) => {
                /* A figure keeps to its column — "45 min, stood 11" steps
                   down a size rather than running into the verdict. */
                let size = i === 0 ? 11 : 9.5;
                font(f.doc, size, 'bold', tone === 'short' ? DANGER : tone === 'met' ? OK : INK2);
                while (size > 7 && f.doc.getTextWidth(san(v)) > colW(f) - 8) { size -= 0.5; f.doc.setFontSize(size); }
                f.doc.text(san(v), f.x + nameW + i * colW(f), y + 15);
              });
              let ty = y + 15 + 13;
              font(f.doc, 8, 'normal', MUTED); f.doc.text(p.agreed, f.x + nameW, ty); ty += p.agreed.length * 10;
              if (p.say.length) { font(f.doc, 8, 'bold', DANGER); f.doc.text(p.say, f.x + nameW, ty); }
              const tc = r.tone === 'done' ? 'done' : r.tone === 'failed' || r.tone === 'late' ? 'late' : r.tone === 'booked' ? 'going' : 'ahead';
              pillPath(f.doc, f.x + f.w - verdictW + 4, y + 5, verdictW - 4, 12, tc, r.outcome);
            },
          })),
        ],
      }));
    }

    if (s.tests && s.tests.length) {
      const sideW = 150;
      const parts = (f: Frame, t: NonNullable<typeof s.tests>[number]) => ({
        title: wrap(f.doc, t.title, f.w - sideW, 9.5, 'bold'),
        agreed: t.passesIf ? wrap(f.doc, `Passes if: ${t.passesIf}`, f.w - sideW, 8.5) : [],
        res: t.run || t.result ? wrap(f.doc, `Result: ${[t.run, t.result].filter(Boolean).join('. ')}`, f.w - sideW, 8.5) : [],
        side: wrap(f.doc, [t.machine, t.when].filter(Boolean).join(' · '), 84, 8),
      });
      out.push(rows({
        rows: s.tests.map(t => ({
          h: f => {
            const p = parts(f, t);
            return 10 + Math.max(p.title.length * 12 + (p.agreed.length + p.res.length) * 10.5, p.side.length * 10, 14) + 6;
          },
          draw: (f, y) => {
            const p = parts(f, t);
            f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
            font(f.doc, 9.5, 'bold'); f.doc.text(p.title, f.x, y + 13);
            let ty = y + 13 + p.title.length * 12;
            if (p.agreed.length) { font(f.doc, 8.5, 'normal', MUTED); f.doc.text(p.agreed, f.x, ty); ty += p.agreed.length * 10.5; }
            if (p.res.length) { font(f.doc, 8.5, 'normal', INK2); f.doc.text(p.res, f.x, ty); }
            font(f.doc, 8, 'normal', MUTED); f.doc.text(p.side, f.x + f.w - sideW + 6, y + 13);
            // A planned day is still ahead — indigo; no day yet stays grey (the colour rules).
            const tc = t.tone === 'done' ? 'done' : t.tone === 'failed' || t.tone === 'late' ? 'late' : t.tone === 'booked' ? 'going' : 'ahead';
            pillPath(f.doc, f.x + f.w - 56, y + 5, 56, 12, tc, t.outcome);
          },
        })),
      }));
    }
  }
  if (quiet.length) {
    const names = quiet.map(s => s.label);
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    out.push(text({ text: `Not started yet — ${list}: nothing kept at ${names.length === 1 ? 'this gate' : 'these gates'} so far.`, size: S.body, colour: MUTED, before: gap(d, 'm'), after: gap(d, 'm') }));
  }

  /* ================================ THE PLAN ================================ */
  /* The Gantt the project page draws, on landscape pages of its own: the
     calendar across the top, a bar per thing on the days it means. After the
     gates, not before them. */
  if (r.plan.length) {
    out.push(pagesOf(f => {
      f.doc.addPage('a4', 'landscape');
      const g0 = gantt(r.plan, { today: r.today, expectedAt: r.expectedAt, plannedAt: r.plannedAt }, r.planRecords);
      /* By machine, as the screen draws it — unless the job has no machine
         to band by, or this device chose the gates. Each machine's next
         stage says "Next" in either (lib/gantt withNext). */
      const { assets, programs, tests, items, stages: lists } = r.planRecords;
      const g = assets?.length ? withNext(g0, { assets, programs, tests, items, today: r.today }) : g0;
      const byMachine = extras.planBy !== 'stage' && assets?.length
        ? withMachines(g, { assets, programs, tests, items, today: r.today }) : g;
      /* By stage, each stage's machines under it, named — as the screen. */
      const stages = extras.planBy === 'stage' && assets?.length ? byStage(g, { assets, programs, tests, ...(lists ? { stages: lists } : {}) }) : g;
      onPlan(drawGantt(f.doc, byMachine.machines?.some(b => b.id) ? byMachine : stages, {
        eyebrow: 'CLIENT REPORT · THE PLAN', title: 'The plan',
        sub: [r.dates, `${r.plan.length} dated · printed ${r.printed}`].filter(Boolean).join('   ·   '),
      }, moveLines(g.groups.flatMap(x => x.rows), r.planRecords.tests, r.planRecords.items, r.planRecords.dayHours)));
    }, { float: true }));
  }

  /* ================================ 3 · FIXES ================================ */
  if (r.fixes.open.length || r.fixes.done.length) {
    out.push(heading('Fixes', `${r.fixes.open.length} open · ${r.fixes.done.length} done`));
    for (const fx of r.fixes.open) out.push(fixCard(fx, extras.shots.get(fx.id)));
    if (r.fixes.done.length) {
      out.push(text({ text: 'Done', size: S.small, style: 'bold', colour: OK, before: 4, after: 3 }));
      r.fixes.done.forEach((fx, i, all) => out.push(text({
        text: `${fx.title}${fx.machine ? ` — ${fx.machine}` : ''}  (${fx.when})`, size: 9, colour: INK2, indent: 12, bullet: '•',
        after: i === all.length - 1 ? gap(d, 's') : 1,
      })));
    }
  }

  /* PROBLEMS WITH NO FIX — seen on the way, kept in the story (lib/noted).
     The heading counts what is open; sorted ones follow under their own word. */
  if (r.noted.open.length || r.noted.sorted.length) {
    out.push(heading('Problems with no fix', `${r.noted.open.length} open${r.noted.sorted.length ? ` · ${r.noted.sorted.length} sorted` : ''}`));
    r.noted.open.forEach((l, i, all) => out.push(text({ text: l, size: 9, colour: INK2, indent: 12, bullet: '•', after: i === all.length - 1 ? gap(d, 's') : 1 })));
    if (r.noted.sorted.length) {
      out.push(text({ text: 'Sorted', size: S.small, style: 'bold', colour: OK, before: 4, after: 3 }));
      r.noted.sorted.forEach((l, i, all) => out.push(text({ text: l, size: 9, colour: INK2, indent: 12, bullet: '•', after: i === all.length - 1 ? gap(d, 's') : 1 })));
    }
  }

  /* ================================ 4 · WHO OWES WHAT ================================ */
  if (r.waiting.length) {
    const whoW = 130;
    const whoLines = (f: Frame, w: string) => wrap(f.doc, w, whoW - 4, 9);
    const whatLines = (f: Frame, w: string) => wrap(f.doc, w, f.w - 210, 9.5, 'bold');
    out.push(heading('What we’re waiting on', 'and whose it is'));
    out.push(rows({
      header: {
        h: () => 13,
        draw: (f, y) => {
          font(f.doc, 7.5, 'bold', MUTED);
          f.doc.text('OPEN', f.x + f.w - 190, y + 7, { align: 'right' }); f.doc.text('LATE', f.x + f.w - 150, y + 7, { align: 'right' }); f.doc.text('MOSTLY WHOSE', f.x + f.w - whoW, y + 7);
        },
      },
      rows: r.waiting.map(w => {
        /* WHICH ONES, under the count, late first — "Tests still to run 10"
           with no names was a number nobody could check (Rowland, 9 October:
           "why 10? I see no reason"). Up to eight, then how many more. */
        const NAMES = 8;
        const said = (w.names ?? []).length
          ? `${(w.names ?? []).slice(0, NAMES).join(' · ')}${(w.names ?? []).length > NAMES ? ` · and ${(w.names ?? []).length - NAMES} more` : ''}`
          : '';
        const nameLines = (f: Frame) => (said ? wrap(f.doc, said, f.w - whoW - 12, 8) : []);
        return {
          h: (f: Frame) => Math.max(18, 6 + Math.max(whoLines(f, w.whose ?? '—').length, whatLines(f, w.what).length) * 11) + nameLines(f).length * 10 + (said ? 3 : 0),
          draw: (f: Frame, y: number) => {
            f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
            font(f.doc, 9.5, 'bold'); f.doc.text(whatLines(f, w.what), f.x, y + 12);
            font(f.doc, 10, 'bold'); f.doc.text(String(w.open), f.x + f.w - 190, y + 12, { align: 'right' });
            font(f.doc, 10, 'bold', w.late ? DANGER : '#aab6c8'); f.doc.text(w.late ? String(w.late) : '—', f.x + f.w - 150, y + 12, { align: 'right' });
            font(f.doc, 9, 'normal', INK2); f.doc.text(whoLines(f, w.whose ?? '—'), f.x + f.w - whoW, y + 12);
            const nl = nameLines(f);
            if (nl.length) {
              const top = y + 6 + Math.max(whoLines(f, w.whose ?? '—').length, whatLines(f, w.what).length) * 11 + 8;
              font(f.doc, 8, 'normal', MUTED); f.doc.text(nl, f.x, top);
            }
          },
        };
      }),
    }));
  }

  /* ================================ 5 · LINE STANDARD ================================ */
  if (extras.standards && r.standards.length) {
    const draw = extras.standards;
    out.push(pagesOf(async f => {
      f.doc.addPage('a4', 'landscape');
      const first = f.doc.getNumberOfPages();
      await draw(f.doc);
      for (let i = first; i <= f.doc.getNumberOfPages(); i++) brandedAlready(f.doc, i);
    }));
  }
  return out;
}

/* The state word beside a step's account, in the one colour that state wears
   everywhere: done a quiet green, late red, a problem that lost no time and
   waiting amber, still ahead indigo, no day yet grey. */
const ACCOUNT_INK: Record<StepAccount['tone'], string> = {
  done: OK, problem: AMBER, late: DANGER, asking: AMBER, booked: BOOKED, ahead: MUTED,
};

/** "Machine — stage" on the left; its day and its state (the grid's square and
 *  word) on the right. Kept with the account under it. */
function accountHead(a: StepAccount): Block {
  const sideW = 150;
  const title = (f: Frame) => wrap(f.doc, `${a.machine} — ${a.stage}`, f.w - sideW - 8, 9, 'bold');
  return {
    ...box(f => 4 + title(f).length * 11.5, (f, y) => {
      const t = title(f);
      font(f.doc, 9, 'bold'); f.doc.text(t, f.x, y + 11);
      // Right-aligned: the state's square and word, then the day before it.
      const loud = a.tone === 'problem' || a.tone === 'late';
      font(f.doc, 8, loud ? 'bold' : 'normal', ACCOUNT_INK[a.tone]);
      const sw = f.doc.getTextWidth(a.state);
      const right = f.x + f.w;
      f.doc.text(a.state, right, y + 11, { align: 'right' });
      cellPath(f.doc, a.tone, right - sw - 13, y + 4, 9, 7);
      font(f.doc, 8, 'normal', MUTED);
      f.doc.text(a.when, right - sw - 19, y + 11, { align: 'right' });
    }, () => 1),
    keepWithNext: true,
  };
}

/** One fix: a coloured edge for its state, what it is, the problem, when and
 *  whose — and its picture beside it, with what is marked on the picture
 *  (ui/Evidence) listed by the numbers drawn on it. Measured whole; never split. */
function fixCard(fx: FixRow, shot: Shot | undefined): Block {
  const textW = (f: Frame) => (shot ? f.w - 130 : f.w - 12);
  const parts = (f: Frame) => ({
    title: wrap(f.doc, fx.title, textW(f), 10, 'bold'),
    prob: fx.problem ? wrap(f.doc, fx.problem, textW(f), 8.5) : [],
    marks: (shot?.marks ?? []).map(m => wrap(f.doc, m, textW(f) - 14, 8)),
    meta: (() => { font(f.doc, 8, 'bold'); const ww = f.doc.getTextWidth(fx.when); return { ww, lines: wrap(f.doc, [fx.machine, fx.who].filter(Boolean).join(' · '), Math.max(40, textW(f) - ww - 20), 8) }; })(),
  });
  const marksH = (p: ReturnType<typeof parts>) => (p.marks.length ? 3 + p.marks.reduce((n, l) => n + l.length, 0) * 10 : 0);
  const inner = (f: Frame) => { const p = parts(f); return Math.max(shot ? 76 : 0, 14 + p.title.length * 12 + p.prob.length * 10.5 + marksH(p) + Math.max(1, p.meta.lines.length) * 10 + 4); };
  return box(f => inner(f) + 8, (f, y) => {
    const p = parts(f), h = inner(f), tone = FIX_COLOUR[fx.tone] ?? BRAND;
    f.doc.setFillColor(tone); f.doc.rect(f.x, y, 3, h, 'F');
    font(f.doc, 10, 'bold'); f.doc.text(p.title, f.x + 10, y + 13);
    let fy = y + 13 + p.title.length * 12;
    if (p.prob.length) { font(f.doc, 8.5, 'normal', INK2); f.doc.text(p.prob, f.x + 10, fy); fy += p.prob.length * 10.5; }
    if (p.marks.length) {
      fy += 2;
      p.marks.forEach((lines, i) => {
        font(f.doc, 8, 'bold', DANGER); f.doc.text(String(i + 1), f.x + 10, fy);
        font(f.doc, 8, 'normal', INK2); f.doc.text(lines, f.x + 24, fy);
        fy += lines.length * 10;
      });
      fy += 1;
    }
    font(f.doc, 8, 'bold', tone); f.doc.text(fx.when, f.x + 10, fy + 2);
    font(f.doc, 8, 'normal', MUTED); f.doc.text(p.meta.lines, f.x + 20 + p.meta.ww, fy + 2);
    if (shot) {
      const k = Math.min(116 / shot.w, 70 / shot.h);
      const iw = shot.w * k, ih = shot.h * k;
      try { f.doc.addImage(shot.data, 'JPEG', f.x + f.w - iw, y + 2, iw, ih); f.doc.setDrawColor(LINE); f.doc.rect(f.x + f.w - iw, y + 2, iw, ih); } catch { /* the words carry it */ }
    }
    f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h + 4, f.x + f.w, y + h + 4);
  }, () => 3);
}

/* ============================ THE STATUS REPORT ============================
 *
 * One page, the one that gets sent (lib/statusReport, docs/SIMPLE.md). Rowland,
 * 7 October: "people want to know the current status of something, the
 * failures of why we're not where we should be, and then what we're going to
 * do about it next." Those three, in that order, in the full report's own
 * colours and words — read off the same reading, so the two cannot disagree.
 * A list longer than the page says how many more the full report has. */
export async function drawStatusReport(doc: jsPDF, report: ClientReport): Promise<void> {
  const { statusReport, STATUS_STEPS } = await import('./statusReport');
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  let s = sanAll(statusReport(report));
  const blocks = (d: Density): Block[] => {
    const out: Block[] = [];
    const S = SIZE;
    out.push(text({ text: 'STATUS REPORT · STAGE GATE', size: S.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
    out.push(text({ text: s.name, size: S.title, style: 'bold', after: 4 }));
    out.push(text({ text: [s.lead ? `Led by ${s.lead}` : '', `Printed ${s.printed}`, s.dates ?? ''].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));

    /* 1 · WHERE WE ARE — the verdict, then a tile per gate. */
    const ot = s.verdict;
    const otLines = (f: Frame) => wrap(f.doc, ot.reason, f.w - 28, 9.5);
    out.push(box(f => 36 + otLines(f).length * 12 + gap(f.density, 'm'), (f, y) => {
      const c = ON_TARGET[ot.tone], l = otLines(f), h = 30 + l.length * 12;
      f.doc.setFillColor(c.fill); f.doc.setDrawColor(c.stroke); f.doc.setLineWidth(ot.tone === 'behind' ? 1.6 : 0.8);
      f.doc.roundedRect(f.x, y, f.w, h, 6, 6, 'FD');
      font(f.doc, 7.5, 'bold', MUTED); f.doc.text('WHERE WE ARE', f.x + 14, y + 13);
      font(f.doc, 12.5, 'bold', c.text); f.doc.text(ot.word, f.x + 14, y + 27);
      font(f.doc, 9.5, 'normal', INK2); f.doc.text(l, f.x + 14, y + 39);
    }, f => gap(f.density, 'm')));
    out.push(...commentaryBlocks(s.commentary, d));
    const gw = (f: Frame) => (f.w - 3 * 8) / 4;
    const gateLines = (f: Frame) => s.gates.map(g => wrap(f.doc, g.says || GATE_COLOUR[g.tone].word, gw(f) - 14, 8));
    out.push(box(f => 24 + Math.max(...gateLines(f).map(l => l.length), 1) * 10 + gap(f.density, 'l'), (f, y) => {
      const ls = gateLines(f), h = 24 + Math.max(...ls.map(l => l.length), 1) * 10;
      s.gates.forEach((g, i) => {
        const x = f.x + i * (gw(f) + 8), c = GATE_COLOUR[g.tone === 'failed' ? 'late' : g.tone];
        f.doc.setDrawColor(c.stroke); f.doc.setLineWidth(1);
        if (g.tone === 'done') { f.doc.setFillColor('#e9f5ef'); f.doc.roundedRect(x, y, gw(f), h, 5, 5, 'FD'); }
        else if (c.fill) { f.doc.setFillColor(c.fill); f.doc.roundedRect(x, y, gw(f), h, 5, 5, 'FD'); }
        else f.doc.roundedRect(x, y, gw(f), h, 5, 5, 'S');
        font(f.doc, 11, 'bold', g.tone === 'done' ? OK : c.text === MUTED ? INK2 : c.text); f.doc.text(g.label, x + 7, y + 15);
        font(f.doc, 8, 'normal', INK2); f.doc.text(ls[i], x + 7, y + 27);
      });
    }, f => gap(f.density, 'l')));

    /* THE PROGRAMS, in one line under the gates (lib/programsReport) — a
       failed one is also a DIDN'T PASS line below; every one is in the full
       report and the programs report. */
    if (s.programs) out.push(text({ text: `Programs: ${s.programs}`, size: 9.5, style: 'bold', colour: INK2, after: s.programLines.length ? 4 : gap(d, 'l') }));
    /* …and their story: the ones still to read, each with what was seen
       (Rowland, 9 October: "we have numbers but not the story"). */
    s.programLines.forEach((p, i, all) => {
      const last = i === all.length - 1 && !s.programMore;
      out.push({ ...text({ text: `${p.what} — ${p.word}`, size: 9, style: 'bold', colour: p.tone === 'r' ? DANGER : INK2, indent: 10, bullet: '•', after: p.note ? 1 : last ? gap(d, 'l') : 2 }), keepWithNext: !!p.note });
      if (p.note) out.push(text({ text: p.note, size: 8.5, colour: MUTED, indent: 22, after: last ? gap(d, 'l') : 3 }));
    });
    if (s.programMore) out.push(text({ text: `and ${s.programMore} more — in the programs report.`, size: 8.5, colour: MUTED, indent: 10, after: gap(d, 'l') }));

    /* 2 · WHY WE ARE NOT WHERE WE SHOULD BE — only the abnormal, a tag in
       its colour, what, and its cause or cost under it. */
    out.push(label('Why we are not where we should be', s.why.length ? DANGER : MUTED));
    if (!s.why.length) out.push(text({ text: 'Nothing — everything is on plan.', colour: INK2, after: gap(d, 'l') }));
    /* Not planned yet is grey — not started, not wrong (docs/JOBSTART.md). */
    const tagColour: Record<string, string> = { critical: DANGER, risk: AMBER, late: DANGER, failed: DANGER, problem: AMBER, unplanned: MUTED };
    const tagW = 62;
    const whyParts = (f: Frame, w: (typeof s.why)[number]) => ({
      what: wrap(f.doc, w.what, f.w - tagW - 8, 9.5, 'bold'),
      detail: w.detail ? wrap(f.doc, w.detail, f.w - tagW - 8, 8.5) : [],
    });
    out.push(rows({
      rows: s.why.map(w => ({
        h: (f: Frame) => { const p = whyParts(f, w); return 6 + p.what.length * 12 + p.detail.length * 10.5 + 6; },
        draw: (f: Frame, y: number) => {
          const p = whyParts(f, w), c = tagColour[w.kind];
          f.doc.setFillColor(c); f.doc.roundedRect(f.x, y + 4, tagW - 6, 12, 3, 3, 'F');
          font(f.doc, 6.5, 'bold', '#ffffff'); f.doc.text(w.tag, f.x + (tagW - 6) / 2, y + 12.3, { align: 'center' });
          font(f.doc, 9.5, 'bold', INK2); f.doc.text(p.what, f.x + tagW, y + 13);
          if (p.detail.length) { font(f.doc, 8.5, 'normal', MUTED); f.doc.text(p.detail, f.x + tagW, y + 13 + p.what.length * 12); }
        },
      })),
      after: s.whyMore ? 's' : 'l',
    }));
    if (s.whyMore) out.push(text({ text: `and ${s.whyMore} more — in the full report.`, size: 8.5, colour: MUTED, after: gap(d, 'l') }));

    /* 3 · WHAT WE ARE DOING ABOUT IT — the open fixes, late first, whose and
       by when; then what we wait on, from whom. */
    out.push(label('What we are doing about it — the fixes'));
    if (!s.next.length) out.push(text({ text: 'No fixes open.', colour: INK2, after: gap(d, 's') }));
    const whenW = 120;
    const nextParts = (f: Frame, n: (typeof s.next)[number]) => ({
      what: wrap(f.doc, n.what, f.w - whenW - 8, 9.5, 'bold'),
      who: [] as string[],
      when: wrap(f.doc, n.when, whenW, 8.5, n.late ? 'bold' : 'normal'),
    });
    out.push(rows({
      rows: s.next.map(n => ({
        h: (f: Frame) => { const p = nextParts(f, n); return 6 + Math.max(p.what.length * 12 + p.who.length * 10.5, p.when.length * 10.5) + 6; },
        draw: (f: Frame, y: number) => {
          const p = nextParts(f, n);
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
          font(f.doc, 9.5, 'bold', INK2); f.doc.text(p.what, f.x, y + 13);
          if (p.who.length) { font(f.doc, 8.5, 'normal', MUTED); f.doc.text(p.who, f.x, y + 13 + p.what.length * 12); }
          font(f.doc, 8.5, n.late ? 'bold' : 'normal', n.late ? DANGER : INK2); f.doc.text(p.when, f.x + f.w - whenW, y + 13);
        },
      })),
      after: 's',
    }));
    if (s.nextMore) out.push(text({ text: `and ${s.nextMore} more open — in the full report.`, size: 8.5, colour: MUTED, after: gap(d, 's') }));
    s.waiting.forEach((w, i, all) => out.push(text({ text: `Waiting on: ${w}`, size: 8.5, colour: INK2, after: i === all.length - 1 ? gap(d, 'l') : 1 })));
    if (!s.waiting.length) out.push(space('m'));

    /* THE PERFORMANCE RUNS — on a job in Commission, the numbers it is
       accepted on: what it netted against what was agreed, the rejects, how
       long, and the verdict. */
    if (s.runs.length) {
      out.push(label('Performance runs'));
      /* A line per product: the product and its machine, then its figures
         against what was agreed, and what fell short when something did. */
      const runParts = (f: Frame, r: (typeof s.runs)[number]) => ({
        head: wrap(f.doc, `${r.product}${r.machine ? ` — ${r.machine}` : ''}`, f.w - 92, 9, 'bold'),
        figs: wrap(f.doc, `Net ${r.net} · ran at ${r.speed} · rejects ${r.rejects} · ran for ${r.length} — agreed: ${r.agreed}`, f.w - 92, 8.5),
        say: r.say ? wrap(f.doc, `Short: ${r.say}`, f.w - 92, 8.5, 'bold') : [],
      });
      out.push(rows({
        rows: s.runs.map(r => ({
          h: (f: Frame) => { const p = runParts(f, r); return 6 + p.head.length * 11 + p.figs.length * 10.5 + p.say.length * 10.5 + 6; },
          draw: (f: Frame, y: number) => {
            const p = runParts(f, r);
            f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
            font(f.doc, 9, 'bold', INK2); f.doc.text(p.head, f.x, y + 13);
            let ty = y + 13 + p.head.length * 11;
            font(f.doc, 8.5, 'normal', INK2); f.doc.text(p.figs, f.x, ty); ty += p.figs.length * 10.5;
            if (p.say.length) { font(f.doc, 8.5, 'bold', DANGER); f.doc.text(p.say, f.x, ty); }
            const tc = r.tone === 'done' ? 'done' : r.tone === 'failed' || r.tone === 'late' ? 'late' : r.tone === 'booked' ? 'going' : 'ahead';
            pillPath(f.doc, f.x + f.w - 84, y + 5, 84, 12, tc, r.outcome);
          },
        })),
      }));
      if (s.runsMore) out.push(text({ text: `and ${s.runsMore} more — in the full report.`, size: 8.5, colour: MUTED, after: gap(d, 's') }));
    }
    return out;
  };
  /* ONE PAGE, ALWAYS: the lists step down until it fits, and each says how
     many more the full report has — never a second page. */
  let density: Density = 'comfortable';
  for (const limits of STATUS_STEPS) {
    s = sanAll(statusReport(report, limits));
    density = await chooseDensity(base, d => blocks(d));
    if ((await pour({ ...base, density, dry: true }, blocks(density), () => undefined)).pages === 1) break;
  }
  await pour({ ...base, density, dry: false }, blocks(density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    const num = `${i} of ${pages}`;
    doc.text(fitLine(doc, `${s.name}  ·  status report  ·  ${s.printed}  ·  every detail is in the full report`, CW - doc.getTextWidth(num) - 16), M, H - 18);
    doc.text(num, W - M, H - 18, { align: 'right' });
  }
}
