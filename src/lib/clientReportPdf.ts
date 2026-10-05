/* THE CLIENT REPORT, ON PAPER — A4, portrait, in the order the job is run.
 * See lib/clientReport.ts for what is on it and why. This only draws. */
import type { jsPDF } from 'jspdf';
import type { ClientReport, CellTone, FixRow, StepAccount } from './clientReport';
import type { GateTone } from './install';
import type { Shot } from './testReport';
import { brandedAlready, san } from './reportKit';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, heading, label, pagesOf, rows, text, wrap } from './report/blocks';
import { gantt, withMachines, type GanttBy } from './gantt';
import { drawGantt } from './ganttPdf';
import { moveLines } from './story';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef';
/* The app's own state colours, so paper and screen say the same thing in the
   same colour: one red (the day has gone), one amber (waiting), one indigo
   (under way, still ahead), one green (done — and quiet). */
const BRAND = '#1f63e0', SHELL = '#0d1f3c', OK = '#1e6b4b', DANGER = '#9b3227', AMBER = '#8a5f14', BOOKED = '#4f46b8';
const DONE_WASH = '#e3efe9';

const GATE_COLOUR: Record<GateTone, { fill?: string; stroke: string; text: string; word: string }> = {
  done: { fill: DONE_WASH, stroke: OK, text: OK, word: 'done' },
  going: { fill: '#eeedfa', stroke: BOOKED, text: BOOKED, word: 'under way' },
  late: { fill: '#fdf2f0', stroke: DANGER, text: DANGER, word: 'late or a problem' },
  ahead: { stroke: '#b8c4d6', text: INK2, word: 'not started' },
  none: { stroke: '#d5dde8', text: MUTED, word: 'nothing kept' },
};
const CELL_COLOUR: Record<CellTone, { fill?: string; stroke: string }> = {
  done: { fill: DONE_WASH, stroke: OK },
  problem: { fill: DANGER, stroke: DANGER },
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

const KEY: [CellTone, string][] = [['problem', 'a problem'], ['late', 'late'], ['asking', 'waiting on a verdict'], ['booked', 'still ahead'], ['ahead', 'no day yet'], ['done', 'done'], ['none', 'not added yet']];

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

function blocksOf(r: ClientReport, extras: ClientReportExtras, d: Density, onPlan: (pages: number[]) => void): Block[] {
  const out: Block[] = [];
  const S = SIZE;

  /* ================================ 1 · WHERE THE JOB IS ================================ */
  out.push(text({ text: 'CLIENT REPORT · STAGE GATE', size: S.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: r.name, size: S.title, style: 'bold', after: 4 }));
  out.push(text({ text: [r.lead ? `Led by ${r.lead}` : '', `Printed ${r.printed}`, r.dates ?? ''].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));

  // the sentence, on the dark band — as tall as its words
  const said = (f: Frame) => wrap(f.doc, r.sentence, f.w - 32, 14, 'bold');
  const slip = (f: Frame) => (r.slip ? wrap(f.doc, r.slip, f.w - 32, 9) : []);
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
      const x = f.x + i * (gw(f) + 8), c = GATE_COLOUR[g.tone];
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
      rows: r.machines.map(m => ({
        h: f => Math.max(20, 8 + nameLines(f, m.name).length * 11),
        draw: (f, y) => {
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
          font(f.doc, 9.5, 'bold'); f.doc.text(nameLines(f, m.name), f.x, y + 13);
          m.gates.forEach((t, i) => pillPath(f.doc, f.x + nameW + i * (cellW(f) + 4), y + 4, cellW(f), 13, t, GATE_COLOUR[t].word));
          font(f.doc, 9, 'bold', INK2); f.doc.text(wrap(f.doc, m.at, atW - 6, 9, 'bold'), f.x + f.w - atW + 4, y + 13);
        },
      })),
    }));
  }

  /* ================================ 2 · GATE BY GATE ================================ */
  /* A GATE WITH NOTHING KEPT IS ONE LINE, NOT A SECTION. A job just started
     printed a heading per gate, each saying "nothing kept" — three of a
     page's sections telling the client nothing. They are named together. */
  const said2 = (s: ClientReport['sections'][number]) =>
    !!(s.grid?.rows.length || s.late.length || s.accounts?.length || s.programs?.total || s.tests?.length);
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

    if (s.late.length && s.gate !== 'commission') {
      out.push(text({ text: 'Late or a problem', size: S.small, style: 'bold', colour: DANGER, after: 3 }));
      s.late.forEach((l, i) => out.push(text({ text: l, size: 9, colour: INK2, indent: 12, bullet: '•', after: i === s.late.length - 1 ? gap(d, 's') : 1 })));
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
        out.push(text({ text: a.said, size: 9, colour: INK2, indent: 12, after: i === all.length - 1 ? gap(d, 'm') : gap(d, 's') + 2 }));
      });
    }

    if (s.programs && s.programs.total) {
      out.push(text({ text: `Programs — ${s.programs.proved} of ${s.programs.total} proved`, size: S.h2, style: 'bold', before: 4, after: 3 }));
      s.programs.notYet.forEach((p, i, all) => out.push(text({
        text: `${p.what}${p.machine ? ` — ${p.machine}` : ''}: ${p.state}`, size: 9, colour: INK2, indent: 12, bullet: '•',
        after: i === all.length - 1 ? gap(d, 's') : 1,
      })));
    }

    if (s.tests && s.tests.length) {
      const sideW = 150;
      const parts = (f: Frame, t: NonNullable<typeof s.tests>[number]) => ({
        title: wrap(f.doc, t.title, f.w - sideW, 9.5, 'bold'),
        agreed: t.passesIf ? wrap(f.doc, `Passes if: ${t.passesIf}`, f.w - sideW, 8.5) : [],
        res: t.result ? wrap(f.doc, `Result: ${t.result}`, f.w - sideW, 8.5) : [],
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
      const g = gantt(r.plan, { today: r.today, expectedAt: r.expectedAt, plannedAt: r.plannedAt }, r.planRecords);
      /* By machine, as the screen draws it — unless the job has no machine
         to band by, or this device chose the gates. */
      const { assets, programs, tests, items } = r.planRecords;
      const byMachine = extras.planBy !== 'stage' && assets?.length
        ? withMachines(g, { assets, programs, tests, items, today: r.today }) : g;
      onPlan(drawGantt(f.doc, byMachine.machines?.some(b => b.id) ? byMachine : g, {
        eyebrow: 'CLIENT REPORT · THE PLAN', title: 'The plan',
        sub: [r.dates, `${r.plan.length} dated · printed ${r.printed}`].filter(Boolean).join('   ·   '),
      }, moveLines(g.groups.flatMap(x => x.rows), r.planRecords.tests, r.planRecords.items)));
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
      rows: r.waiting.map(w => ({
        h: f => Math.max(18, 6 + Math.max(whoLines(f, w.whose ?? '—').length, whatLines(f, w.what).length) * 11),
        draw: (f, y) => {
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
          font(f.doc, 9.5, 'bold'); f.doc.text(whatLines(f, w.what), f.x, y + 12);
          font(f.doc, 10, 'bold'); f.doc.text(String(w.open), f.x + f.w - 190, y + 12, { align: 'right' });
          font(f.doc, 10, 'bold', w.late ? DANGER : '#aab6c8'); f.doc.text(w.late ? String(w.late) : '—', f.x + f.w - 150, y + 12, { align: 'right' });
          font(f.doc, 9, 'normal', INK2); f.doc.text(whoLines(f, w.whose ?? '—'), f.x + f.w - whoW, y + 12);
        },
      })),
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
   everywhere: done a quiet green, a problem or late red, waiting amber, still
   ahead indigo, no day yet grey. */
const ACCOUNT_INK: Record<StepAccount['tone'], string> = {
  done: OK, problem: DANGER, late: DANGER, asking: AMBER, booked: BOOKED, ahead: MUTED,
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
 *  whose — and its picture beside it. Measured whole; never split. */
function fixCard(fx: FixRow, shot: Shot | undefined): Block {
  const textW = (f: Frame) => (shot ? f.w - 130 : f.w - 12);
  const parts = (f: Frame) => ({
    title: wrap(f.doc, fx.title, textW(f), 10, 'bold'),
    prob: fx.problem ? wrap(f.doc, fx.problem, textW(f), 8.5) : [],
    meta: (() => { font(f.doc, 8, 'bold'); const ww = f.doc.getTextWidth(fx.when); return { ww, lines: wrap(f.doc, [fx.machine, fx.who].filter(Boolean).join(' · '), Math.max(40, textW(f) - ww - 20), 8) }; })(),
  });
  const inner = (f: Frame) => { const p = parts(f); return Math.max(shot ? 76 : 0, 14 + p.title.length * 12 + p.prob.length * 10.5 + Math.max(1, p.meta.lines.length) * 10 + 4); };
  return box(f => inner(f) + 8, (f, y) => {
    const p = parts(f), h = inner(f), tone = FIX_COLOUR[fx.tone] ?? BRAND;
    f.doc.setFillColor(tone); f.doc.rect(f.x, y, 3, h, 'F');
    font(f.doc, 10, 'bold'); f.doc.text(p.title, f.x + 10, y + 13);
    let fy = y + 13 + p.title.length * 12;
    if (p.prob.length) { font(f.doc, 8.5, 'normal', INK2); f.doc.text(p.prob, f.x + 10, fy); fy += p.prob.length * 10.5; }
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
