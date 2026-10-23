/* THE 6M CLIENT REPORT — a running line's root cause story, on A4.
 *
 * docs/SIXM.md, "The client report": the gap → where the loss is → each
 * problem, its fishbone drawn and then the four parts the working method is
 * worked in (docs/SIXM.md, "Problem · Why · Fix · Did it work") — Problem (the
 * head, its number, where it came from, where it is and is not), Why (every
 * chain of answers, each with how it is known, its root marked and read
 * back), Fix (each countermeasure, who, when, what it should change, its
 * state) and Did it work (the number since, each fix's prediction beside what
 * happened, and whether it is holding) → the board by bone → what was seen on
 * the line. A problem that runs over a page carries on under its own
 * "(continued)" heading.
 *
 * Two halves in one file, the way the screen and the paper are one job (house
 * rule 2): `sixmReport()` turns the records into the sentences and rows — the
 * screen lists them, the paper prints them — and `drawSixMReport()` pours them
 * through the report engine (lib/report, docs/REPORTS.md). Blocks measure
 * themselves; nothing is cut; a section with nothing to say is not printed;
 * the fishbone is one measured block, and when a problem has more causes than
 * the drawing can carry, the drawing names the leading ones per bone — every
 * cause still prints whole, as a chain under Why.
 *
 * Colours are the house's five states and nothing else (CLAUDE.md, visual
 * management): the bones are told apart by place and name; a confirmed cause
 * is solid, a suspected one an outline, a ruled-out one struck through — and
 * each says so in words beside the mark. */
import type { jsPDF } from 'jspdf';





import {          type SixM } from './sixm';


import {   say } from './measures';


import {  fmtN } from './capacity';

import { san, paperBand } from './reportKit';

import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, heading, label, lead, rows, text, wrap, type Row } from './report/blocks';




import { lossBlocks } from './report/lossTable';
import { samplingBlocks } from './report/samplingTable';



import { changeoverBlocks } from './report/changeoverTable';
import { streamBlocks } from './report/streamTable';

import { leanClosing, leanTiles } from './report/lean';
import { sixmClosing, sixmFigures, sixmTiles } from './sixmLean';

import {  type SixMReport, type Tone, type GapLine, day, plural, type ProblemRep, type CauseRep, type CounterRep, type BoardRow } from './sixmReport';
export * from './sixmReport';
/* ================================== the paper ================================== */

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#0f1417', INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', RIB = '#b9c4c7';
const BRAND = '#0c7489';
/* The app's five state colours — the same values the stage-gate report uses. */
const OK = '#15803d', DANGER = '#c4281c', AMBER = '#b45309', BOOKED = '#6d28d9', GREY = '#b9c4c7';
const TONE: Record<Tone, { fill?: string; stroke: string; text: string; weight: number }> = {
  failed: { fill: DANGER, stroke: DANGER, text: '#ffffff', weight: 1 },
  late: { fill: '#fdf2f0', stroke: DANGER, text: DANGER, weight: 1.6 },
  waiting: { fill: '#fff7e6', stroke: AMBER, text: AMBER, weight: 0.9 },
  going: { fill: '#eeedfa', stroke: BOOKED, text: BOOKED, weight: 0.9 },
  ahead: { stroke: GREY, text: INK2, weight: 0.8 },
  done: { fill: '#e3efe9', stroke: OK, text: OK, weight: 0.7 },
};

/** Every string in the report through the one door the other PDFs use. */
function sanAll<T>(v: T): T {
  if (typeof v === 'string') return san(v) as T;
  if (Array.isArray(v)) return v.map(sanAll) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sanAll(x)])) as T;
  return v;
}

/** A state, in words, in its colour — never colour alone. */
function pill(doc: jsPDF, x: number, y: number, w: number, tone: Tone, words: string, h = 12): void {
  const c = TONE[tone];
  doc.setLineWidth(c.weight); doc.setDrawColor(c.stroke);
  if (c.fill) { doc.setFillColor(c.fill); doc.roundedRect(x, y, w, h, 3, 3, 'FD'); } else doc.roundedRect(x, y, w, h, 3, 3, 'S');
  font(doc, SIZE.tiny, 'bold', c.text);
  doc.text(words, x + w / 2, y + h / 2 + 2.4, { align: 'center' });
}
/** A pill as wide as its words, within a limit. */
function pillW(doc: jsPDF, words: string, max: number): number {
  font(doc, SIZE.tiny, 'bold');
  return Math.min(max, doc.getTextWidth(words) + 12);
}

export async function drawSixMReport(doc: jsPDF, report: SixMReport): Promise<void> {
  const r = sanAll(report);
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(r, d));
  await pour({ ...base, density, dry: false }, blocksOf(r, density), () => doc.addPage('a4', 'portrait'));

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    font(doc, 7.5, 'normal', MUTED);
    const num = `${i} of ${pages}`;
    const room = pw - 2 * M - doc.getTextWidth(num) - 16;
    doc.text(fitLine(doc, r.name, r.scope ?? '', `  ·  client report  ·  ${r.printed}`, room), M, ph - 18);
    doc.text(num, pw - M, ph - 18, { align: 'right' });
  }
}

/* ================================ the one page ================================ */

/** THE 6M STATUS, ON ONE PAGE (lib/sixmStatus; docs/SIMPLE.md; flow audit
 *  #17) — where we are, why we are not where we should be, what we are
 *  doing about it. Its lists step down a row at a time until it is one
 *  page, each saying how many more the full report has — never a second
 *  page. The band is the full report's own; so are the words. */
export async function drawSixMStatus(doc: jsPDF, report: SixMReport): Promise<void> {
  const { sixmStatus, SIXM_STATUS_STEPS } = await import('./sixmStatus');
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  let s = sanAll(sixmStatus(report));
  const blocks = (d: Density): Block[] => {
    const out: Block[] = [];
    out.push(text({ text: 'STATUS REPORT · 6M — WHERE WE ARE, WHY, AND WHAT IS BEING DONE', size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
    out.push(text({ text: s.scope ? `${s.name} — ${s.scope}` : s.name, size: SIZE.title, style: 'bold', after: 4 }));
    out.push(text({ text: [s.lead ? `Led by ${s.lead}` : '', `Printed ${s.printed}`].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));

    /* 1 · WHERE WE ARE — the band, then each line against its target. */
    const said = (f: Frame) => wrap(f.doc, s.sentence, f.w - 32, 14, 'bold');
    const slip = (f: Frame) => wrap(f.doc, s.slip, f.w - 32, 9.5);
    out.push(box(f => 30 + said(f).length * 17 + slip(f).length * 12.5 + 8 + gap(f.density, 'm'), (f, y) => {
      const l = said(f), sl = slip(f);
      paperBand(f.doc, f.x, y, f.w, 30 + l.length * 17 + sl.length * 12.5 + 8, 8);
      font(f.doc, 7.5, 'bold', MUTED); f.doc.text(s.manyLines ? 'WHERE THE LINES ARE' : 'WHERE THE LINE IS', f.x + 16, y + 16);
      font(f.doc, 14, 'bold', INK); f.doc.text(l, f.x + 16, y + 34);
      font(f.doc, 9.5, 'normal', INK2); f.doc.text(sl, f.x + 16, y + 36 + l.length * 17);
    }, f => gap(f.density, 'm')));
    /* the tiles (lib/sixmLean) — the full report's, counted from the same model */
    out.push(leanTiles(sixmTiles(sixmFigures(report))));
    if (s.week) out.push(text({ text: s.week.text, size: 9.5, style: 'bold', colour: s.week.tone === 'r' ? DANGER : s.week.tone === 'a' ? AMBER : INK2, after: gap(d, 's') }));
    for (const g of s.lines) out.push(gapBlock({ line: g.line, says: g.says, ...(g.short ? { short: g.short } : {}) }));
    if (s.gapNone) out.push(text({ text: s.gapNone, colour: MUTED, after: gap(d, 's') }));
    out.push({ height: f => gap(f.density, 's'), draw: () => undefined });

    /* 2 · WHY WE ARE NOT WHERE WE SHOULD BE — only the abnormal, a tag in its
       colour (red the day gone or slipped, amber a check coming due), what,
       and its cause, who or when under it. */
    out.push(label('Why we are not where we should be', s.why.length ? DANGER : MUTED));
    if (!s.why.length) out.push(text({ text: 'Nothing — every line measured is at its target, nothing has slipped back, no check is missed and no countermeasure is past its day.', colour: INK2, after: gap(d, 'l') }));
    const tagW = 78;
    const whyParts = (f: Frame, w: (typeof s.why)[number]) => ({
      what: wrap(f.doc, w.what, f.w - tagW - 8, SIZE.body, 'bold'),
      detail: w.detail ? wrap(f.doc, w.detail, f.w - tagW - 8, SIZE.small) : [],
    });
    out.push(rows({
      rows: s.why.map(w => ({
        h: (f: Frame) => { const p = whyParts(f, w); return 6 + p.what.length * 12 + p.detail.length * 10.5 + 6; },
        draw: (f: Frame, y: number) => {
          const p = whyParts(f, w);
          pill(f.doc, f.x, y + 4, tagW - 8, w.kind === 'due' ? 'waiting' : w.kind === 'slipped' ? 'failed' : 'late', w.tag);
          font(f.doc, SIZE.body, 'bold', INK2); f.doc.text(p.what, f.x + tagW, y + 13);
          if (p.detail.length) { font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.detail, f.x + tagW, y + 13 + p.what.length * 12); }
        },
      })),
      after: s.whyMore ? 's' : 'l',
    }));
    if (s.whyMore) out.push(text({ text: `and ${s.whyMore} more — in the full report.`, size: SIZE.small, colour: MUTED, after: gap(d, 'l') }));

    /* 3 · WHAT WE ARE DOING ABOUT IT — each open problem and where it is,
       then the countermeasures open, late first, whose and by when. */
    out.push(label('What we are doing about it — the problems being worked'));
    if (!s.problems.length) out.push(text({ text: 'No problem open.', colour: INK2, after: gap(d, 's') }));
    const stateW = 110;
    const probParts = (f: Frame, p: (typeof s.problems)[number]) => wrap(f.doc, `${p.title}${p.number ? ` — ${p.number}` : ''}`, f.w - stateW - 10, SIZE.body, 'bold');
    out.push(rows({
      rows: s.problems.map(p => ({
        h: (f: Frame) => 6 + probParts(f, p).length * 12 + 4,
        draw: (f: Frame, y: number) => {
          rule(f, y);
          font(f.doc, SIZE.body, 'bold', INK2); f.doc.text(probParts(f, p), f.x, y + 13);
          pill(f.doc, f.x + f.w - stateW, y + 4, stateW, p.tone, p.phase);
        },
      })),
      after: 's',
    }));
    if (s.problemsMore) out.push(text({ text: `and ${s.problemsMore} more open — in the full report.`, size: SIZE.small, colour: MUTED, after: gap(d, 's') }));
    out.push(label('…and the countermeasures, late first'));
    if (!s.next.length) out.push(text({ text: 'Nothing open on the board.', colour: INK2, after: gap(d, 's') }));
    const whenW = 130;
    const nextParts = (f: Frame, n: (typeof s.next)[number]) => ({
      what: wrap(f.doc, n.what, f.w - whenW - 10, SIZE.body, 'bold'),
      who: wrap(f.doc, n.who, f.w - whenW - 10, SIZE.small),
      when: wrap(f.doc, n.when, whenW, SIZE.small, n.late ? 'bold' : 'normal'),
    });
    out.push(rows({
      rows: s.next.map(n => ({
        h: (f: Frame) => { const p = nextParts(f, n); return 6 + Math.max(p.what.length * 12 + p.who.length * 10.5, p.when.length * 10.5) + 5; },
        draw: (f: Frame, y: number) => {
          const p = nextParts(f, n);
          rule(f, y);
          font(f.doc, SIZE.body, 'bold', INK2); f.doc.text(p.what, f.x, y + 13);
          font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.who, f.x, y + 13 + p.what.length * 12);
          font(f.doc, SIZE.small, n.late ? 'bold' : 'normal', n.late ? DANGER : INK2); f.doc.text(p.when, f.x + f.w - whenW, y + 13);
        },
      })),
      after: 's',
    }));
    if (s.nextMore) out.push(text({ text: `and ${s.nextMore} more open — in the full report.`, size: SIZE.small, colour: MUTED, after: gap(d, 's') }));
    return out;
  };
  /* ONE PAGE, ALWAYS. */
  let density: Density = 'comfortable';
  for (const limits of SIXM_STATUS_STEPS) {
    s = sanAll(sixmStatus(report, limits));
    density = await chooseDensity(base, d => blocks(d));
    if ((await pour({ ...base, density, dry: true }, blocks(density), () => undefined)).pages === 1) break;
  }
  await pour({ ...base, density, dry: false }, blocks(density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    font(doc, 7.5, 'normal', MUTED);
    const num = `${i} of ${pages}`;
    doc.text(fitLine(doc, s.name, s.scope ?? '', `  ·  status report  ·  ${s.printed}  ·  every detail is in the full report`, pw - 2 * M - doc.getTextWidth(num) - 16), M, ph - 18);
    doc.text(num, pw - M, ph - 18, { align: 'right' });
  }
}

/** One line that fits — for the running footer only; the full name is on
 *  page 1. It is the job's name that gives way, never the line, the words
 *  "client report" or the day it was printed (a long name used to push the
 *  date off a line deck's footer: "… · client report · 4…"). Only a line
 *  whose own name will not fit beside the words — one long code, from the
 *  random seeds — is cut too, at its end, so nothing runs into the page
 *  number. */
function fitLine(doc: jsPDF, name: string, scope: string, tail: string, w: number): string {
  const said = (n: string, sc: string) => `${n}${sc ? ` — ${sc}` : ''}${tail}`;
  if (doc.getTextWidth(said(name, scope)) <= w) return said(name, scope);
  const words = name.split(' ');
  while (words.length > 1 && doc.getTextWidth(said(words.join(' ') + '…', scope)) > w) words.pop();
  const short = words.join(' ') + (words.length < name.split(' ').length ? '…' : '');
  if (doc.getTextWidth(said(short, scope)) <= w) return said(short, scope);
  let sc = scope;
  while (sc && doc.getTextWidth(said(short, sc + '…')) > w) sc = sc.slice(0, -1);
  const t = said(short, sc ? sc.trimEnd() + '…' : '');
  if (doc.getTextWidth(t) <= w) return t;
  /* the words alone are longer than the line: cut at the end */
  let cut = t;
  while (cut.length > 1 && doc.getTextWidth(cut + '…') > w) cut = cut.slice(0, -1);
  return cut.trimEnd() + '…';
}

const rule = (f: Frame, y: number) => { f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y); };

/** A table header row: small capitals at given x offsets. */
function headerRow(cols: [string, number, ('left' | 'right')?][], title?: string): Row {
  return {
    h: () => (title ? 26 : 13),
    draw: (f, y) => {
      let yy = y;
      if (title) { font(f.doc, SIZE.small, 'bold', INK); f.doc.text(title, f.x, yy + 9); yy += 13; }
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      for (const [t, x, a] of cols) f.doc.text(t.toUpperCase(), f.x + x, yy + 8, a === 'right' ? { align: 'right' } : undefined);
    },
  };
}

function blocksOf(r: SixMReport, d: Density): Block[] {
  const out: Block[] = [];
  const S = SIZE;

  /* ============================ the front ============================ */
  out.push(text({ text: 'CLIENT REPORT · 6M — THE GAP, ITS CAUSES, AND WHAT IS BEING DONE', size: S.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: r.scope ? `${r.name} — ${r.scope}` : r.name, size: S.title, style: 'bold', after: 4 }));
  out.push(text({ text: [r.lead ? `Led by ${r.lead}` : '', `Printed ${r.printed}`].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));

  const said = (f: Frame) => wrap(f.doc, r.sentence, f.w - 32, 14, 'bold');
  const slip = (f: Frame) => wrap(f.doc, r.slip, f.w - 32, 9.5);
  out.push(box(f => 30 + said(f).length * 17 + slip(f).length * 12.5 + 8 + gap(f.density, 'l'), (f, y) => {
    const l = said(f), sl = slip(f);
    const bandH = 30 + l.length * 17 + sl.length * 12.5 + 8;
    paperBand(f.doc, f.x, y, f.w, bandH, 8);
    font(f.doc, 7.5, 'bold', MUTED); f.doc.text(r.manyLines ? 'WHERE THE LINES ARE' : 'WHERE THE LINE IS', f.x + 16, y + 16);
    font(f.doc, 14, 'bold', INK); f.doc.text(l, f.x + 16, y + 34);
    font(f.doc, 9.5, 'normal', INK2); f.doc.text(sl, f.x + 16, y + 36 + l.length * 17);
  }, f => gap(f.density, 'l')));
  /* THE TILES (docs/LEAN-PAGE.md; lib/sixmLean) — the gap, the problems, the
     roots, the countermeasures, what is holding: the sections below, counted */
  const figures = sixmFigures(r);
  out.push(leanTiles(sixmTiles(figures)));
  if (r.week) out.push(text({ text: r.week.text, size: 9.5, style: 'bold', colour: r.week.tone === 'r' ? DANGER : r.week.tone === 'a' ? AMBER : INK2, after: gap(d, 'm') }));

  /* ============================ 1 · the gap ============================ */
  if (r.gaps.length) {
    const short = r.gaps.filter(g => g.short).length;
    out.push(heading('The gap', r.gaps.length === 1 ? 'The line against its target' : `Each line against its target${short ? ` — ${short} short` : ''}`));
    for (const g of r.gaps) {
      out.push(gapBlock(g));
      if (g.series && g.series.points.length >= 2) out.push(chartBlock(g.series));
    }
  } else if (r.gapNone) out.push(text({ text: r.gapNone, colour: MUTED, before: gap(d, 's'), after: gap(d, 'm') }));

  /* ======================== 2 · where the loss is ======================== */
  if (r.pareto || r.constraints.length) {
    out.push(heading('Where the loss is', r.pareto ? `${r.pareto.period ? `${r.pareto.period} · ` : ''}${r.pareto.says}` : 'Line capacity — what limits each line'));
    if (r.pareto) out.push(paretoBlock(r.pareto));
    for (const c of r.constraints) {
      out.push(label(`The constraint — ${c.line}`));
      out.push(text({ text: c.says, size: S.body, colour: INK2, after: 4 }));
      out.push(stationsBlock(c));
    }
  }

  /* ============================ 3 · problems ============================ */
  if (r.noProblems) out.push(text({ text: r.noProblems, colour: MUTED, before: gap(d, 'm'), after: gap(d, 'm') }));
  for (const p of r.problems) problemBlocks(p, d, out);

  /* ========================== 4 · the board ========================== */
  if (r.board.length) {
    out.push(heading('The board by bone', `Every action, its owner and its day — ${r.boardSays}`));
    for (const b of r.board) out.push(boardBlock(b));
    if (r.boardQuiet) out.push(text({ text: r.boardQuiet, colour: MUTED, after: gap(d, 'm') }));
  }

  /* ======================= 5 · what was seen ======================= */
  if (r.seen) {
    out.push(heading('What was seen on the line', `From the filmed walk — ${r.seen.says}`));
    if (r.seen.rows.length) out.push(seenBlock(r.seen.rows));
    if (r.seen.closed.length) out.push(text({ text: `Closed since: ${r.seen.closed.join('; ')}.`, size: S.small, colour: MUTED, after: gap(d, 'm') }));
  }

  /* THE CLOSING LINE — where the lines are and what is wrong with the work,
     at the foot of the story; the evidence is its appendix */
  out.push(leanClosing(sixmClosing(figures)));

  /* ======================= 6 · evidence ======================= */
  if (r.evidence.length) {
    out.push(heading('Evidence', `${r.evidence.length} ${r.evidence.length === 1 ? 'study' : 'studies'} · measured by people at the line`));
    r.evidence.forEach((e, i, all) => {
      out.push(text({ text: e.title, size: S.body, style: 'bold', before: i ? 4 : 0, after: 1 }));
      out.push(text({ text: `Used for: ${e.used}`, size: S.small, colour: MUTED, after: 1 }));
      out.push(text({ text: e.line, size: S.small + 0.5, colour: e.tone === 'r' ? '#c4281c' : INK2, after: e.stream || e.changeover || e.losses || e.sampling ? 4 : i === all.length - 1 ? gap(d, 's') : 2 }));
      if (e.stream) out.push(...streamBlocks(e.stream.rows, e.stream.total));
      if (e.changeover) out.push(...changeoverBlocks(e.changeover, e.line));
      if (e.losses) out.push(...lossBlocks(e.losses));
      if (e.sampling) out.push(...samplingBlocks(e.sampling));
    });
  }
  return out;
}

/* ---------------------------------- the gap ---------------------------------- */

function gapBlock(g: GapLine): Block {
  /* The line's name, then its sentence; the "short" words in red — the one
     abnormal number on the line. */
  const parts = (f: Frame) => ({
    says: wrap(f.doc, g.says, f.w, SIZE.body + 0.5, 'bold'),
    owner: g.owner ? wrap(f.doc, `Owner: ${g.owner}`, f.w, SIZE.small) : [],
  });
  return {
    height: f => { const p = parts(f); return p.says.length * lead(SIZE.body + 0.5, f.density) + p.owner.length * lead(SIZE.small, f.density) + gap(f.density, 's'); },
    after: f => gap(f.density, 's'),
    lead: f => { const p = parts(f); return p.says.length * lead(SIZE.body + 0.5, f.density) + p.owner.length * lead(SIZE.small, f.density); },
    keepWithNext: !!g.series && g.series.points.length >= 2,
    draw: (f, y) => {
      const p = parts(f), lh = lead(SIZE.body + 0.5, f.density);
      p.says.forEach((l, i) => {
        const yy = y + (SIZE.body + 0.5) * 0.92 + i * lh;
        const k = g.short ? l.indexOf(g.short) : -1;
        if (k < 0) { font(f.doc, SIZE.body + 0.5, 'bold', INK); f.doc.text(l, f.x, yy); return; }
        font(f.doc, SIZE.body + 0.5, 'bold', INK); const pre = l.slice(0, k); f.doc.text(pre, f.x, yy);
        const x2 = f.x + f.doc.getTextWidth(pre);
        font(f.doc, SIZE.body + 0.5, 'bold', DANGER); f.doc.text(g.short as string, x2, yy);
        font(f.doc, SIZE.body + 0.5, 'bold', INK); f.doc.text(l.slice(k + (g.short as string).length), x2 + f.doc.getTextWidth(g.short as string), yy);
      });
      if (p.owner.length) { font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.owner, f.x, y + p.says.length * lh + SIZE.small * 0.92); }
    },
  };
}

/** The line's measure over time, against its target — drawn, not described. */
function chartBlock(s: NonNullable<GapLine['series']>): Block {
  const CH = 96;
  return box(f => CH + gap(f.density, 'm'), (f, y) => {
    const doc = f.doc;
    const px0 = f.x + 34, px1 = f.x + f.w - 56, py0 = y + 16, py1 = y + CH - 16;
    const vals = [...s.points.map(p => p.value), ...(s.target != null ? [s.target] : [])];
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi === lo) { hi += 1; lo -= 1; }
    const padV = (hi - lo) * 0.12; lo -= padV; hi += padV;
    const t0 = Date.parse(`${s.points[0].at}T12:00:00`), t1 = Date.parse(`${s.points[s.points.length - 1].at}T12:00:00`);
    const X = (at: string) => px0 + (t1 > t0 ? ((Date.parse(`${at}T12:00:00`) - t0) / (t1 - t0)) : 0.5) * (px1 - px0);
    const Y = (v: number) => py1 - ((v - lo) / (hi - lo)) * (py1 - py0);
    font(doc, SIZE.tiny, 'bold', MUTED);
    doc.text(`${s.measure.toUpperCase()}${s.unit ? ` (${s.unit})` : ''} · ${s.better === 'up' ? 'HIGHER' : 'LOWER'} IS BETTER`, f.x, y + 8);
    doc.setDrawColor(LINE); doc.setLineWidth(0.5);
    doc.line(px0, py1, px1, py1); doc.line(px0, py0, px0, py1);
    font(doc, SIZE.tiny, 'normal', MUTED);
    doc.text(fmtN(Math.round(hi * 10) / 10), px0 - 4, py0 + 3, { align: 'right' });
    doc.text(fmtN(Math.round(lo * 10) / 10), px0 - 4, py1, { align: 'right' });
    doc.text(day(s.points[0].at), px0, py1 + 10);
    doc.text(day(s.points[s.points.length - 1].at), px1, py1 + 10, { align: 'right' });
    if (s.target != null) {
      doc.setDrawColor(INK2); doc.setLineWidth(0.9); doc.setLineDashPattern([3, 2], 0);
      doc.line(px0, Y(s.target), px1, Y(s.target)); doc.setLineDashPattern([], 0);
      font(doc, SIZE.tiny, 'bold', INK2);
      doc.text(`Target ${say(s.target)}`, px1 + 4, Y(s.target) + 2.5);
    }
    doc.setDrawColor(INK); doc.setLineWidth(1.4);
    for (let i = 1; i < s.points.length; i++) doc.line(X(s.points[i - 1].at), Y(s.points[i - 1].value), X(s.points[i].at), Y(s.points[i].value));
    doc.setFillColor(INK);
    for (const p of s.points) doc.circle(X(p.at), Y(p.value), 1.6, 'F');
    const last = s.points[s.points.length - 1];
    font(doc, SIZE.small, 'bold', INK);
    const lastY = Y(last.value), tY = s.target != null ? Y(s.target) : -99;
    doc.text(say(last.value), px1 + 4, Math.abs(lastY - tY) < 9 ? (lastY < tY ? lastY - 4 : lastY + 10) : lastY + 3);
  }, f => gap(f.density, 'm'));
}

/* ------------------------------ where the loss is ------------------------------ */

function paretoBlock(p: NonNullable<SixMReport['pareto']>): Block {
  const nameW = 150, numW = 150;
  const max = Math.max(...p.rows.map(r => r.mins), 1);
  const names = (f: Frame, t: string, vital: boolean) => wrap(f.doc, t, nameW - 8, SIZE.small, vital ? 'bold' : 'normal');
  return rows({
    header: headerRow([['Category', 0], ['Minutes lost', nameW], ['Minutes · share · stops', 0]].map(([t, x], i) => (i === 2 ? [t as string, CW, 'right'] : [t as string, x as number])) as [string, number, ('left' | 'right')?][]),
    rows: p.rows.map(row => ({
      h: f => Math.max(15, 5 + names(f, row.category, row.vital).length * 10),
      draw: (f, y) => {
        rule(f, y);
        font(f.doc, SIZE.small, row.vital ? 'bold' : 'normal', INK); f.doc.text(names(f, row.category, row.vital), f.x, y + 10);
        const bw = (f.w - nameW - numW) * (row.mins / max);
        f.doc.setFillColor(row.vital ? INK2 : '#c4ccce'); f.doc.rect(f.x + nameW, y + 4, Math.max(1, bw), 7, 'F');
        font(f.doc, SIZE.small, 'normal', INK2);
        f.doc.text(`${Math.round(row.mins).toLocaleString('en-GB')} min · ${Math.round(row.share * 100)}% · ${plural(row.stops, 'stop')}`, f.x + f.w, y + 10, { align: 'right' });
      },
    })),
  });
}

function stationsBlock(c: SixMReport['constraints'][number]): Block {
  const nameW = 170, numW = 120;
  const top = Math.max(...c.stations.map(s => s.running), 1) * 1.04;
  const names = (f: Frame, t: string, limit: boolean) => wrap(f.doc, t, nameW - 40, SIZE.small, limit ? 'bold' : 'normal');
  return rows({
    rows: c.stations.map(s => ({
      h: f => Math.max(15, 5 + names(f, s.name, s.limit).length * 10),
      draw: (f, y) => {
        rule(f, y);
        font(f.doc, SIZE.small, s.limit ? 'bold' : 'normal', INK); f.doc.text(names(f, s.name, s.limit), f.x, y + 10);
        if (s.limit) { f.doc.setDrawColor(INK); f.doc.setLineWidth(0.8); f.doc.roundedRect(f.x + nameW - 36, y + 3, 32, 10, 2, 2, 'S'); font(f.doc, SIZE.tiny, 'bold', INK); f.doc.text('LIMIT', f.x + nameW - 20, y + 10.2, { align: 'center' }); }
        const span = f.w - nameW - numW;
        f.doc.setFillColor('#dde3ec'); f.doc.rect(f.x + nameW, y + 4, Math.max(1, span * s.running / top), 7, 'F');
        f.doc.setFillColor(s.limit ? INK : '#86949a'); f.doc.rect(f.x + nameW, y + 4, Math.max(1, span * s.effective / top), 7, 'F');
        font(f.doc, SIZE.small, s.limit ? 'bold' : 'normal', INK2);
        f.doc.text(`${fmtN(s.effective)} of ${fmtN(s.running)} ${c.unit}/min`, f.x + f.w, y + 10, { align: 'right' });
      },
    })),
    after: 'm',
  });
}

/* --------------------------------- a problem --------------------------------- */

/* EACH PROBLEM, IN THE FOUR PARTS IT IS WORKED IN (docs/SIXM.md, the working
 * method): its title and phase, the fish drawn, then Problem · Why · Fix · Did
 * it work. The heading asks for the whole of it on one page when a page can
 * hold it (`keep`), so the fish and its four parts are read together; when it
 * is longer, everything after the heading carries "Problem n — … (continued)"
 * to the top of any page it runs onto — never cut, never "…". */
function problemBlocks(p: ProblemRep, d: Density, out: Block[]): void {
  const own: Block[] = [];
  const cont = heading(`Problem ${p.n} — ${p.title} (continued)`, undefined, { size: SIZE.h2 + 1 });
  const add = (b: Block) => own.push({ ...b, runHead: cont });

  // The phase in words and colour, then the line and its days — travels with the fish.
  const metaLines = (f: Frame) => wrap(f.doc, p.meta, f.w - pillW(f.doc, p.phaseWord, 140) - 10, SIZE.small);
  add({
    keepWithNext: true,
    height: f => Math.max(14, metaLines(f).length * lead(SIZE.small, f.density)) + 6,
    draw: (f, y) => {
      const pw = pillW(f.doc, p.phaseWord, 140);
      pill(f.doc, f.x, y, pw, p.tone, p.phaseWord);
      font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(metaLines(f), f.x + pw + 10, y + 9);
    },
  });
  const fish = p.causeCount ? fishbone(p) : undefined;
  if (fish) add({ ...fish.block, keepWithNext: true });

  /* ------------------------------- Problem ------------------------------- */
  add(part('Problem'));
  if (p.says) add(text({ text: p.says, size: SIZE.body, style: 'bold', after: 3 }));
  if (p.measure) add(text({ text: p.measure, size: SIZE.body, colour: INK2, after: 3 }));
  if (p.from) add(text({ text: `Where it came from: ${p.from}`, size: SIZE.small, colour: INK2, after: 3 }));
  /* Where it is and is not, from the stops — printed only when there is something to say. */
  if (p.is.length) add(text({ text: `Is: ${p.is.join(' · ')}`, size: SIZE.small, colour: INK2, after: 2 }));
  if (p.isNot.length) add(text({ text: `Is not: ${p.isNot.join(' · ')}`, size: SIZE.small, colour: INK2, after: 2 }));
  if (!p.says && !p.measure && !p.from && !p.is.length && !p.isNot.length) add(text({ text: 'Not measured yet.', size: SIZE.small, colour: MUTED, after: 2 }));

  /* --------------------------------- Why --------------------------------- */
  add(part('Why', p.whySays));
  if (p.suggested) add(text({ text: p.suggested, size: SIZE.small, colour: MUTED, after: gap(d, 's') }));
  for (const ch of p.chains) {
    /* The chain's bone, how sure, and whether its root is found — then its
       answers in order, each with how it is known, the root in bold. */
    add({ ...text({ text: ch.head + (ch.from ? `  ·  ${ch.from}` : ''), size: SIZE.small, style: 'bold', colour: ch.state === 'out' ? MUTED : INK2, before: 3, after: 2 }), keepWithNext: true });
    ch.answers.forEach((a, i) => {
      const last = i === ch.answers.length - 1;
      add({
        ...text({
          text: `${a.text}${a.known ? ` (${a.known})` : ''}${last && ch.state === 'root' ? ' — the root' : ''}`,
          size: SIZE.body - 0.5, colour: ch.state === 'out' ? MUTED : INK, indent: 22, bullet: `${i + 1}`, after: 2,
          style: last && ch.state === 'root' ? 'bold' : 'normal',
        }),
        keepWithNext: !last || ch.therefore.length > 0,
      });
    });
    if (ch.therefore.length) {
      add({ ...text({ text: 'Read back from the root:', size: SIZE.small, style: 'bold', colour: MUTED, before: 2, after: 1, indent: 22 }), keepWithNext: true });
      ch.therefore.forEach((t, i) => add(text({ text: t, size: SIZE.small, colour: MUTED, indent: 22, after: i === ch.therefore.length - 1 ? gap(d, 's') : 1 })));
    }
  }
  /* "The causes are next" only while it is finding them — never under a
     problem that is holding or closed (said in the model). */
  if (p.rootless) add(text({ text: p.rootless, size: SIZE.small, colour: MUTED, after: gap(d, 's') }));
  /* The whys written before the fishbone, until they are put on a bone. */
  if (p.written) add(text({ text: `Written before the fishbone: ${p.written}`, size: SIZE.body - 0.5, colour: INK2, after: gap(d, 's') }));

  /* --------------------------------- Fix --------------------------------- */
  add(part('Fix', p.counterSays));
  if (p.counter.length) add(counterRows(p.counter));
  else add(text({ text: 'No fix on the board for it yet.', size: SIZE.small, colour: MUTED, after: gap(d, 's') }));

  /* ----------------------------- Did it work ----------------------------- */
  add(part('Did it work'));
  add(text({ text: p.worked.says, size: SIZE.body, style: 'bold', colour: p.worked.tone === 'failed' ? DANGER : INK, after: 3 }));
  if (p.worked.number) add(text({ text: p.worked.number, size: SIZE.body, colour: INK2, after: 3 }));
  if (p.worked.fixes.length) add(workedRows(p.worked.fixes));
  if (p.hold) { add(label('Keeping the gain')); add(holdBlock(p.hold)); }

  /* The heading asks for the whole problem on one page when one can hold it;
     when it is longer, for the fish and its Problem — the first look. */
  const head: Block = { ...heading(`Problem ${p.n} — ${p.title}`), keep: f => {
    const all = own.reduce((n, b) => n + b.height(f), 0);
    const page = f.bottom - f.top;
    if (all + 60 <= page) return all + 60;
    const upTo = own.findIndex((b, i) => i > 0 && b.height(f) > 0 && isPart(b, 'Why'));
    return own.slice(0, upTo < 0 ? own.length : upTo).reduce((n, b) => n + b.height(f), 0) + 60;
  } };
  out.push(head, ...own);
}

/** A part's heading: Problem · Why · Fix · Did it work, with its count beside. */
const PART = Symbol('part');
function part(title: 'Problem' | 'Why' | 'Fix' | 'Did it work', says?: string): Block {
  /* The title in bold; its count beside it in small grey when it fits on the
     line, else under it — wrapped, never cut. */
  const lay = (f: Frame) => {
    font(f.doc, SIZE.h2, 'bold');
    const tw = f.doc.getTextWidth(title) + 8;
    const beside = says ? wrap(f.doc, says, f.w - tw, SIZE.small) : [];
    const under = beside.length > 1 && says ? wrap(f.doc, says, f.w, SIZE.small) : [];
    return { tw, beside: under.length ? [] : beside, under };
  };
  const b: Block & { [PART]?: string } = {
    keepWithNext: true,
    height: f => 7 + lead(SIZE.h2, f.density) + lay(f).under.length * lead(SIZE.small, f.density) + 3,
    draw: (f, y) => {
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y + 3, f.x + f.w, y + 3);
      const l = lay(f), yy = y + 7 + SIZE.h2 * 0.92;
      font(f.doc, SIZE.h2, 'bold', INK); f.doc.text(title, f.x, yy);
      font(f.doc, SIZE.small, 'normal', MUTED);
      if (l.beside.length) f.doc.text(l.beside[0], f.x + l.tw, yy);
      l.under.forEach((u, i) => f.doc.text(u, f.x, yy + lead(SIZE.h2, f.density) - 2 + i * lead(SIZE.small, f.density)));
    },
  };
  b[PART] = title;
  return b;
}
const isPart = (b: Block, title: string) => (b as Block & { [PART]?: string })[PART] === title;

/* -------------------------------- the fishbone -------------------------------- */

const HEAD_W = 112, TAIL = 14, SLOPE = 0.3, LBL = 15, PAD = 9, ROOT_W = 21;
const TXT = 7.5, TLH = 8.8, META = 7, MLH = 8.6;

/** A cause as placed on its bone: `d` its distance from the spine (near
 *  edge), `x` where its mark sits, and whether ROOT needs a line of its own. */
interface Placed { c: CauseRep; lines: string[]; d: number; h: number; x: number; rootLine: boolean; fixLines: string[] }
interface Region { m: SixM; label: string; up: boolean; xr: number; placed: Placed[]; total: number }
interface FishLayout { up: number; down: number; regions: Region[]; head: { lines: string[]; h: number }; complete: boolean; height: number }

const EMPTY_BONE = 'Nothing found yet';
const causeStyle = (c: CauseRep) => (c.status === 'confirmed' ? 'bold' as const : 'normal' as const);
const metaOf = (c: CauseRep) => `${c.grade} · ${c.statusWord}`;

/* THE FISH, MEASURED. Three bones above the spine (People, Machine, Method)
 * and three below (Material, Measurement, Environment), each slanting into
 * the spine towards the head. A cause sits between its own bone and the one
 * before it, on a rib that runs into its bone — so its column slants with the
 * bones and keeps the same width however far from the spine it is. Each half
 * is as tall as its fullest bone needs, and never shorter than half the head. */
function layoutFish(f: Frame, p: ProblemRep, K: number): FishLayout {
  const doc = f.doc;
  const x0 = f.x + TAIL, x1 = f.x + f.w - HEAD_W - 6;
  const regW = (x1 - x0) / 3;
  const headLines = wrap(doc, p.title, HEAD_W - 18, 9.5, 'bold');
  const headH = 18 + headLines.length * 11.5 + (p.number ? 12 : 0) + 22;
  let complete = true;
  const regions: Region[] = p.bones.map((b, k) => {
    const i = k % 3;
    const xr = x0 + (i + 1) * regW - 3;           // where this bone meets the spine
    const prev = x0 + i * regW - 3;               // where the bone before it does
    const placed: Placed[] = [];
    let dd = PAD;
    for (const c of b.causes) {
      if (placed.length >= K) { complete = false; continue; }
      /* Room between the bone before (at this cause's near edge) and its own
         bone (at its far edge): the bones slant together, so it is the
         region's width less the slant over the cause's own height. */
      const left = i === 0 ? Math.max(f.x + 1, x0 + 2 - SLOPE * dd) : prev - SLOPE * dd + 6;
      const room = (h: number) => xr - SLOPE * (dd + h) - 5 - (left + 9);
      const fit = (h: number) => {
        const lines = wrap(doc, c.text, room(h), TXT, causeStyle(c));
        font(doc, META, 'normal');
        const rootLine = !!c.root && doc.getTextWidth(metaOf(c)) + 4 + ROOT_W > room(h);
        /* Its fixes take lines of their own under the meta, wrapped to the
           room — never squeezed beside the words or cut (as on screen, a
           narrow rib gives the tag its own line). */
        const fixLines = c.fix ? wrap(doc, c.fix.words, room(h), META, c.fix.tone === 'r' ? 'bold' : 'normal') : [];
        return { lines, rootLine, fixLines, h: lines.length * TLH + MLH * ((rootLine ? 2 : 1) + fixLines.length) + 6 };
      };
      let g = fit(3 * TLH + MLH + 6);
      g = fit(g.h);
      if (g.lines.length > 4) { complete = false; continue; }   // too long to draw well — it is in the full list
      placed.push({ c, lines: g.lines, d: dd, h: g.h, x: left, rootLine: g.rootLine, fixLines: g.fixLines });
      dd += g.h;
    }
    return { m: b.m, label: b.label, up: k < 3, xr, placed, total: b.causes.length };
  });
  const need = (up: boolean) => Math.max(...regions.filter(g => g.up === up).map(g => g.placed.reduce((n, x) => n + x.h, 0) + (g.placed.length ? 0 : 12) + PAD + LBL + 6));
  const upH = Math.max(need(true), headH / 2 + 10, 44);
  const downH = Math.max(need(false), headH / 2 + 10, 44);
  return { up: upH, down: downH, regions, head: { lines: headLines, h: headH }, complete, height: upH + downH + 20 };
}

function fishbone(p: ProblemRep): { block: Block; layout: (f: Frame) => FishLayout } {
  /* As many causes per bone as keeps the drawing under three fifths of a
     page — at least one each. Measured with the real font at the page's width
     and kept, so the dry run and the drawing agree. */
  const cache = new Map<string, FishLayout>();
  const layout = (f: Frame): FishLayout => {
    const key = `${f.w}:${f.bottom - f.top}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const maxH = (f.bottom - f.top) * 0.6;
    let K = 6, l = layoutFish(f, p, K);
    while (l.height > maxH && K > 1) { K--; l = layoutFish(f, p, K); }
    cache.set(key, l);
    return l;
  };
  return {
    block: box(f => layout(f).height + gap(f.density, 'm'), (f, y) => drawFish(f, y, p, layout(f)), f => gap(f.density, 'm')),
    layout,
  };
}

function drawFish(f: Frame, y: number, p: ProblemRep, l: FishLayout): void {
  const doc = f.doc;
  const spineY = y + l.up;
  const x0 = f.x + TAIL, hx = f.x + f.w - HEAD_W;
  /* the spine, and the tail */
  doc.setDrawColor(INK); doc.setLineWidth(2.4); doc.setLineCap('round');
  doc.line(x0, spineY, hx, spineY);
  doc.setLineWidth(1.6);
  doc.line(x0, spineY, x0 - 12, spineY - 10); doc.line(x0, spineY, x0 - 12, spineY + 10);
  doc.setLineCap('butt');

  /* the six bones: People, Machine, Method above; Material, Measurement, Environment below */
  for (const g of l.regions) {
    const dir = g.up ? -1 : 1, half = g.up ? l.up : l.down;
    const len = half - LBL - 2;
    const endX = g.xr - SLOPE * len, endY = spineY + dir * len;
    doc.setDrawColor(INK2); doc.setLineWidth(1.3);
    doc.line(g.xr, spineY, endX, endY);
    // the bone's name at its outer end, with how many causes it carries
    font(doc, SIZE.small, 'bold', INK);
    const name = g.label.toUpperCase();
    const nw = doc.getTextWidth(name);
    font(doc, SIZE.tiny, 'normal', MUTED);
    const cnt = g.total ? `  ${g.total}` : '';
    const cw = doc.getTextWidth(cnt);
    const lx = Math.max(f.x, endX - (nw + cw) / 2);
    const ly = g.up ? spineY - half + 9 : spineY + half - 3;
    font(doc, SIZE.small, 'bold', INK); doc.text(name, lx, ly);
    font(doc, SIZE.tiny, 'normal', MUTED); if (cnt) doc.text(cnt, lx + nw, ly);
    if (!g.placed.length) {
      /* The screen's words for an empty bone (ui/fishbone/layout boneWords) —
         never "looked", which was not true beside "the data suggests causes
         not yet looked at" on the same bone. */
      font(doc, SIZE.tiny, 'normal', MUTED);
      doc.text(EMPTY_BONE, g.xr - SLOPE * (PAD + 6) - 4 - doc.getTextWidth(EMPTY_BONE), g.up ? spineY - PAD - 2 : spineY + PAD + 8);
    }
    /* each cause: its words on a rib that runs into the bone */
    for (const pc of g.placed) {
      const top = g.up ? spineY - pc.d - pc.h : spineY + pc.d;
      const ribY = top + pc.h - 2;
      const ribX = g.xr - SLOPE * Math.abs(ribY - spineY);
      doc.setDrawColor(RIB); doc.setLineWidth(0.6); doc.line(pc.x, ribY, ribX, ribY);
      const ty = top + TXT;
      // the mark: solid confirmed, outline suspected, a cross for ruled out
      doc.setLineWidth(0.8);
      if (pc.c.status === 'confirmed') { doc.setFillColor(INK); doc.circle(pc.x + 3, ty - 2.6, 2.4, 'F'); }
      else if (pc.c.status === 'suspected') { doc.setDrawColor(INK); doc.circle(pc.x + 3, ty - 2.6, 2.3, 'S'); }
      else { doc.setDrawColor(MUTED); doc.line(pc.x + 1, ty - 4.6, pc.x + 5, ty - 0.6); doc.line(pc.x + 5, ty - 4.6, pc.x + 1, ty - 0.6); }
      const out = pc.c.status === 'ruled_out';
      font(doc, TXT, causeStyle(pc.c), out ? MUTED : INK);
      pc.lines.forEach((ln, i) => {
        const by = ty + i * TLH;
        doc.text(ln, pc.x + 9, by);
        if (out) { doc.setDrawColor(MUTED); doc.setLineWidth(0.6); doc.line(pc.x + 9, by - 2.4, pc.x + 9 + doc.getTextWidth(ln), by - 2.4); }
      });
      const my = ty + pc.lines.length * TLH;
      font(doc, META, 'normal', MUTED);
      const meta = metaOf(pc.c);
      doc.text(meta, pc.x + 9, my - 0.5);
      if (pc.c.root) {
        const mx = pc.rootLine ? pc.x + 9 : pc.x + 9 + doc.getTextWidth(meta) + 4;
        const ry = pc.rootLine ? my + MLH : my;
        doc.setFillColor(INK); doc.roundedRect(mx, ry - 6.6, ROOT_W, 8, 1.5, 1.5, 'F');
        font(doc, 6.5, 'bold', '#ffffff'); doc.text('ROOT', mx + ROOT_W / 2, ry - 0.8, { align: 'center' });
      }
      /* Its fixes, in the house colour: past due the loud red, waiting amber,
         under way indigo, done a quiet green, not started grey. */
      if (pc.c.fix) {
        const fy = my + MLH * (pc.rootLine ? 2 : 1);
        const t = pc.c.fix.tone;
        font(doc, META, t === 'r' ? 'bold' : 'normal', t === 'r' ? DANGER : t === 'a' ? AMBER : t === 'w' ? BOOKED : t === 'g' ? OK : MUTED);
        pc.fixLines.forEach((ln, i) => doc.text(ln, pc.x + 9, fy - 0.5 + i * MLH));
      }
    }
  }

  /* the head: the problem, its number, and where it is — in words */
  const hh = l.head.h, hy = spineY - hh / 2;
  /* light on paper (reportKit paperBand), its edge the brand's teal, its words graphite */
  paperBand(doc, hx, hy, HEAD_W, hh, 9);
  doc.setDrawColor('#d6dfdf'); doc.setLineWidth(0.6); doc.roundedRect(hx, hy, HEAD_W, hh, 9, 9, 'S');
  font(doc, SIZE.tiny, 'bold', MUTED); doc.text(`PROBLEM ${p.n}`, hx + 9, hy + 13);
  font(doc, 9.5, 'bold', INK); doc.text(l.head.lines, hx + 9, hy + 25);
  let yy = hy + 25 + l.head.lines.length * 11.5;
  if (p.number) { font(doc, SIZE.small, 'normal', INK2); doc.text(p.number, hx + 9, yy - 2); yy += 12; }
  const pw = Math.min(HEAD_W - 18, pillW(doc, p.phaseWord, HEAD_W - 18));
  doc.setFillColor('#ffffff'); doc.roundedRect(hx + 8, yy - 4, pw + 2, 14, 3, 3, 'F');
  pill(doc, hx + 9, yy - 3, pw, p.tone, p.phaseWord);

  /* the key, under the drawing */
  const ky = y + l.up + l.down + 12;
  font(doc, SIZE.tiny, 'normal', MUTED);
  let kx = f.x;
  doc.setFillColor(INK); doc.circle(kx + 3, ky - 2.5, 2.3, 'F'); doc.text('confirmed', kx + 8, ky); kx += 8 + doc.getTextWidth('confirmed') + 12;
  doc.setDrawColor(INK); doc.setLineWidth(0.8); doc.circle(kx + 3, ky - 2.5, 2.2, 'S'); doc.text('suspected', kx + 8, ky); kx += 8 + doc.getTextWidth('suspected') + 12;
  doc.setDrawColor(MUTED); doc.line(kx + 1, ky - 4.5, kx + 5, ky - 0.5); doc.line(kx + 5, ky - 4.5, kx + 1, ky - 0.5);
  doc.text('ruled out (struck through)', kx + 8, ky); kx += 8 + doc.getTextWidth('ruled out (struck through)') + 12;
  doc.setFillColor(INK); doc.roundedRect(kx, ky - 6.6, ROOT_W, 8, 1.5, 1.5, 'F');
  font(doc, 6.5, 'bold', '#ffffff'); doc.text('ROOT', kx + ROOT_W / 2, ky - 0.8, { align: 'center' });
  font(doc, SIZE.tiny, 'normal', MUTED); doc.text('drilled to its root with the five whys', kx + ROOT_W + 4, ky);
}

/** Fix: each countermeasure — what, the cause it is for, what it should
 *  change, its day in words when it has no date; its bone and owner; its
 *  state and day in the house colours and words. What a done one did is
 *  under Did it work, beside what it was expected to do. */
function counterRows(list: CounterRep[]): Block {
  const sideW = 104, stateW = 96;
  const parts = (f: Frame, c: CounterRep) => {
    const w = f.w - sideW - stateW - 10;
    return {
      what: wrap(f.doc, c.what, w, SIZE.body - 0.5, c.tone === 'done' ? 'normal' : 'bold'),
      cause: c.cause ? wrap(f.doc, `For: ${c.cause}`, w, SIZE.small) : [],
      exp: c.expect && c.tone !== 'done' ? wrap(f.doc, `Should change: ${c.expect}`, w, SIZE.small) : [],
      words: c.words ? wrap(f.doc, `When: ${c.words}`, w, SIZE.small) : [],
      proved: c.proved ? wrap(f.doc, c.proved, w, SIZE.small) : [],
      side: wrap(f.doc, [c.bone, c.owner || 'No owner'].join(' · '), sideW - 8, SIZE.small),
    };
  };
  return rows({
    rows: list.map(c => ({
      h: f => {
        const p = parts(f, c);
        return 8 + Math.max(p.what.length * 11.5 + (p.cause.length + p.exp.length + p.words.length + p.proved.length) * 10.5, p.side.length * 10.5, 14) + 5;
      },
      draw: (f, y) => {
        const p = parts(f, c);
        const done = c.tone === 'done';
        rule(f, y);
        let ty = y + 12;
        font(f.doc, SIZE.body - 0.5, done ? 'normal' : 'bold', done ? MUTED : INK); f.doc.text(p.what, f.x, ty); ty += p.what.length * 11.5;
        if (p.cause.length) { font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.cause, f.x, ty - 1); ty += p.cause.length * 10.5; }
        if (p.exp.length) { font(f.doc, SIZE.small, 'normal', INK2); f.doc.text(p.exp, f.x, ty - 1); ty += p.exp.length * 10.5; }
        if (p.words.length) { font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.words, f.x, ty - 1); ty += p.words.length * 10.5; }
        if (p.proved.length) { font(f.doc, SIZE.small, 'bold', INK2); f.doc.text(p.proved, f.x, ty - 1); }
        font(f.doc, SIZE.small, 'normal', done ? MUTED : INK2); f.doc.text(p.side, f.x + f.w - sideW - stateW, y + 12);
        pill(f.doc, f.x + f.w - stateW, y + 4, stateW, c.tone, c.when);
      },
    })),
  });
}

/** Did it work: each fix done — what it was expected to do, beside what happened. */
function workedRows(list: ProblemRep['worked']['fixes']): Block {
  const half = (f: Frame) => (f.w - 12) / 2;
  const parts = (f: Frame, x: ProblemRep['worked']['fixes'][number]) => ({
    what: wrap(f.doc, x.what, f.w, SIZE.small + 0.5, 'bold'),
    exp: wrap(f.doc, `Expected: ${x.expect ?? 'nothing written'}`, half(f), SIZE.small),
    hap: wrap(f.doc, `What happened: ${x.happened}`, half(f), SIZE.small, 'bold'),
  });
  return rows({
    rows: list.map(x => ({
      h: f => { const p = parts(f, x); return 7 + p.what.length * 11 + Math.max(p.exp.length, p.hap.length) * 10.5 + 4; },
      draw: (f, y) => {
        const p = parts(f, x);
        rule(f, y);
        font(f.doc, SIZE.small + 0.5, 'bold', INK); f.doc.text(p.what, f.x, y + 11);
        const ty = y + 10 + p.what.length * 11;
        font(f.doc, SIZE.small, 'normal', x.expect ? INK2 : MUTED); f.doc.text(p.exp, f.x, ty);
        font(f.doc, SIZE.small, 'bold', x.happened === 'not written up yet' ? MUTED : INK2); f.doc.text(p.hap, f.x + half(f) + 12, ty);
      },
    })),
  });
}

function holdBlock(h: NonNullable<ProblemRep['hold']>): Block {
  const stateW = 120;
  const words = (f: Frame) => wrap(f.doc, `The check: ${h.what}`, f.w - stateW - 10, SIZE.body - 0.5, 'bold');
  const meta = (f: Frame) => wrap(f.doc, [h.who, h.every, `since ${h.since}`, h.last ? `last checked ${h.last}` : 'not checked yet', h.due].filter(Boolean).join(' · '), f.w - stateW - 10, SIZE.small);
  return box(f => 8 + words(f).length * 11.5 + meta(f).length * 10.5 + 6 + gap(f.density, 'm'), (f, y) => {
    rule(f, y);
    const wl = words(f);
    font(f.doc, SIZE.body - 0.5, 'bold', INK); f.doc.text(wl, f.x, y + 12);
    font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(meta(f), f.x, y + 11 + wl.length * 11.5);
    pill(f.doc, f.x + f.w - stateW, y + 4, stateW, h.tone, h.word);
  }, f => gap(f.density, 'm'));
}

/* --------------------------------- the board --------------------------------- */

function boardBlock(b: SixMReport['board'][number]): Block {
  const ownerW = 100, stateW = 100;
  const parts = (f: Frame, r: BoardRow) => {
    const w = f.w - ownerW - stateW - 10;
    return {
      what: wrap(f.doc, r.what, w, SIZE.small + 0.5, r.tone === 'done' ? 'normal' : 'bold'),
      why: [...(r.why ? wrap(f.doc, `Why: ${r.why}`, w, SIZE.small) : []), ...(r.words ? wrap(f.doc, `When: ${r.words}`, w, SIZE.small) : [])],
      cause: r.cause ? wrap(f.doc, r.cause, w, SIZE.small) : [],
      proved: r.proved ? wrap(f.doc, r.proved, w, SIZE.small) : [],
      owner: wrap(f.doc, [r.owner || 'No owner', r.line].filter(Boolean).join(' · '), ownerW - 8, SIZE.small),
    };
  };
  return rows({
    header: headerRow([['What, and why', 0], ['Who', CW - ownerW - stateW], ['State · day', CW - stateW]], `${b.label.toUpperCase()} — ${b.says}`),
    rows: b.rows.map(r => ({
      h: f => { const p = parts(f, r); return 7 + Math.max(p.what.length * 11 + (p.why.length + p.cause.length + p.proved.length) * 10, p.owner.length * 10, 13) + 4; },
      draw: (f, y) => {
        const p = parts(f, r);
        rule(f, y);
        const done = r.tone === 'done';
        let ty = y + 11;
        font(f.doc, SIZE.small + 0.5, done ? 'normal' : 'bold', done ? MUTED : INK); f.doc.text(p.what, f.x, ty); ty += p.what.length * 11;
        if (p.why.length) { font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.why, f.x, ty - 1); ty += p.why.length * 10; }
        if (p.cause.length) { font(f.doc, SIZE.small, 'normal', INK2); f.doc.text(p.cause, f.x, ty - 1); ty += p.cause.length * 10; }
        if (p.proved.length) { font(f.doc, SIZE.small, 'bold', INK2); f.doc.text(p.proved, f.x, ty - 1); }
        font(f.doc, SIZE.small, 'normal', done ? MUTED : INK2); f.doc.text(p.owner, f.x + f.w - ownerW - stateW, y + 11);
        pill(f.doc, f.x + f.w - stateW, y + 3, stateW, r.tone, r.when);
      },
    })),
  });
}

function seenBlock(list: NonNullable<SixMReport['seen']>['rows']): Block {
  const whereW = 120, ownerW = 96, stateW = 84;
  const parts = (f: Frame, r: typeof list[number]) => ({
    what: wrap(f.doc, r.what, f.w - whereW - ownerW - stateW - 12, SIZE.small + 0.5, 'bold'),
    found: r.found,
    where: wrap(f.doc, r.where, whereW - 8, SIZE.small),
    owner: wrap(f.doc, r.owner || 'No owner', ownerW - 8, SIZE.small),
  });
  return rows({
    header: headerRow([['What was seen', 0], ['Where', CW - whereW - ownerW - stateW], ['Who', CW - ownerW - stateW], ['State', CW - stateW]]),
    rows: list.map(r => ({
      h: f => { const p = parts(f, r); return 7 + Math.max(p.what.length * 11 + 10, p.where.length * 10, p.owner.length * 10, 13) + 4; },
      draw: (f, y) => {
        const p = parts(f, r);
        rule(f, y);
        font(f.doc, SIZE.small + 0.5, 'bold', INK); f.doc.text(p.what, f.x, y + 11);
        font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.found, f.x, y + 10 + p.what.length * 11);
        font(f.doc, SIZE.small, 'normal', INK2); f.doc.text(p.where, f.x + f.w - whereW - ownerW - stateW, y + 11);
        f.doc.text(p.owner, f.x + f.w - ownerW - stateW, y + 11);
        pill(f.doc, f.x + f.w - stateW, y + 3, stateW, r.tone, r.state);
      },
    })),
  });
}

