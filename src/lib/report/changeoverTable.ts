/* SMED ON PAPER — docs/TOOLKIT.md tool 6, "a page"; docs/REPORTS.md §1.
 *
 * The screen's grid is read by its fill and its lanes; the paper says the
 * same as a table, as the value stream's grid becomes one (streamTable): a
 * row per element in its order — what is done, who does it, where, I or E
 * (internal: the line stopped; external: could be done while it runs), its
 * plan, its time, the elapsed changeover by the end of its column (elements
 * done at the same time share one), how it is known — the totals, then the
 * figures in words: the minutes now and separated, the ladder to
 * single-digit minutes, the setting and trial runs, what the changeovers
 * cost a shift, a week and a year, and the interval. An element a fix or a
 * countermeasure was raised from says so under its name (the branch off the
 * element); an element carried from the changeover before is said in one
 * line over the table and its figures are grey (the old ones). Rows break
 * between pages, never inside one, the header drawn again overleaf
 * (blocks.rows).
 *
 * The words are worked out in lib/ie/changeover (changeoverSheet); this only
 * draws. No colour: the side is said by its letter, as the screen's fill is. */
import type { ChangeoverSheet } from '../../tools/changeover/changeover';
import { INK, INK2, LINE, MUTED } from '../reportKit';
import { font, rows, text, wrap, SIZE, type Row } from './blocks';
import type { Block, Frame } from './flow';

const T = 7.5;         // the table's type size
const LH = 9.5;        // its line height
type Col = 'n' | 'name' | 'who' | 'where' | 'side' | 'plan' | 'minutes' | 'elapsed' | 'how';
const ORDER: Col[] = ['n', 'name', 'who', 'where', 'side', 'plan', 'minutes', 'elapsed', 'how'];
const HEAD: Record<Col, string> = { n: '#', name: 'What is done', who: 'Who', where: 'Where', side: 'I/E', plan: 'The plan', minutes: 'Time', elapsed: 'Elapsed', how: 'How known' };

/** Column widths for a frame: the figures fixed, the words sharing what is left. */
const cols = (w: number): { x: Record<Col, number>; w: Record<Col, number> } => {
  const fixed = { n: 14, side: 20, minutes: 40, elapsed: 42, how: 52 };
  const rest = Math.max(240, w - (fixed.n + fixed.side + fixed.minutes + fixed.elapsed + fixed.how));
  const width: Record<Col, number> = { ...fixed, name: rest * 0.36, who: rest * 0.17, where: rest * 0.17, plan: rest * 0.30 };
  const x = {} as Record<Col, number>;
  let at = 0;
  for (const c of ORDER) { x[c] = at; at += width[c]; }
  return { x, w: width };
};

type R = ChangeoverSheet['rows'][number];

function parts(f: Frame, r: R) {
  const c = cols(f.w);
  const w = (k: Col) => c.w[k] - 5;
  return {
    c,
    name: wrap(f.doc, r.name, w('name'), T, 'bold'),
    branch: r.branch ? wrap(f.doc, `Being made better: ${r.branch}`, w('name'), T - 0.5) : [],
    who: wrap(f.doc, r.who, w('who'), T),
    where: wrap(f.doc, r.where, w('where'), T),
    plan: wrap(f.doc, r.plan, w('plan'), T),
    how: wrap(f.doc, r.how, w('how') + 3, T),
  };
}

function rowH(f: Frame, r: R): number {
  const p = parts(f, r);
  return 5 + Math.max(p.name.length + p.branch.length, p.who.length, p.where.length, p.plan.length, p.how.length, 1) * LH + 3;
}

const listOf = (ns: number[]): string => (ns.length < 2 ? String(ns[0] ?? '') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);

/** The table, the line over it when elements are carried, and the figures in
 *  words under it — those the study's own sentence above the table (`said`)
 *  does not already say, so nothing is printed twice. */
export function changeoverBlocks(sheet: ChangeoverSheet, said0 = ''): Block[] {
  const lines = sheet.lines.filter(l => !said0.includes(l));
  const carried = sheet.rows.filter(r => r.carried).map(r => r.n);
  const said = !carried.length ? '' : carried.length === sheet.rows.length
    ? 'Every element is carried from the changeover before — not timed again yet; their figures are the old ones, in grey.'
    : `Element${carried.length === 1 ? '' : 's'} ${listOf(carried)} carried from the changeover before — not timed again yet; ${carried.length === 1 ? 'its figure is' : 'their figures are'} the old one${carried.length === 1 ? '' : 's'}, in grey.`;
  return [
    ...(said ? [text({ text: said, size: SIZE.tiny + 0.5, colour: MUTED, after: 3 })] : []),
    ...(sheet.rows.length ? [table(sheet)] : []),
    ...lines.map((l, i, all) => text({ text: l, size: 8.5, colour: INK2, after: i === all.length - 1 ? 6 : 2 })),
  ];
}

function table(sheet: ChangeoverSheet): Block {
  const header: Row = {
    h: () => 14,
    draw: (f, y) => {
      const { x } = cols(f.w);
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      for (const c of ORDER) f.doc.text(HEAD[c].toUpperCase(), f.x + x[c], y + 9);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 12.5, f.x + f.w, y + 12.5);
    },
  };
  const body: Row[] = sheet.rows.map(r => ({
    h: f => rowH(f, r),
    draw: (f, y) => {
      const p = parts(f, r), { x } = p.c, ty = y + 5 + T * 0.92;
      /* an element carried from before: its figures in grey — the old ones */
      const fig = r.carried ? MUTED : INK2;
      font(f.doc, T, 'normal', MUTED); f.doc.text(String(r.n), f.x + x.n, ty);
      font(f.doc, T, 'bold', INK); f.doc.text(p.name, f.x + x.name, ty);
      if (p.branch.length) { font(f.doc, T - 0.5, 'normal', INK2); f.doc.text(p.branch, f.x + x.name, ty + p.name.length * LH); }
      font(f.doc, T, 'normal', INK2); f.doc.text(p.who, f.x + x.who, ty); f.doc.text(p.where, f.x + x.where, ty);
      /* internal bold, external plain — the screen's solid and hatched, in type */
      font(f.doc, T, r.side === 'I' ? 'bold' : 'normal', fig); f.doc.text(r.side, f.x + x.side, ty);
      font(f.doc, T, 'normal', INK2); f.doc.text(p.plan, f.x + x.plan, ty);
      font(f.doc, T, 'normal', fig); f.doc.text(r.minutes, f.x + x.minutes, ty);
      font(f.doc, T, 'normal', fig); f.doc.text(r.elapsed, f.x + x.elapsed, ty);
      font(f.doc, T, 'normal', MUTED); f.doc.text(p.how, f.x + x.how, ty);
      const h = rowH(f, r);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h - 0.5, f.x + f.w, y + h - 0.5);
    },
  }));
  /* the totals: the stop's two sides and the work by everyone on it, across
     the word columns — measured, so it wraps rather than runs off — and the
     elapsed changeover under its column */
  const footW = (f: Frame) => { const c = cols(f.w); return c.w.name + c.w.who + c.w.where + c.w.side + c.w.plan - 6; };
  const footLines = (f: Frame) => wrap(f.doc, `Total — ${sheet.total.internal} internal, ${sheet.total.external} external; ${sheet.total.labour} of work by everyone on it`, footW(f), T, 'bold');
  const foot: Row = {
    h: f => 6 + footLines(f).length * LH + 2,
    draw: (f, y) => {
      const { x } = cols(f.w), ty = y + 6 + T * 0.92;
      font(f.doc, T, 'bold', INK);
      f.doc.text(footLines(f), f.x + x.name, ty);
      f.doc.text(sheet.total.minutes, f.x + x.elapsed, ty);
    },
  };
  return rows({ header, rows: [...body, foot], after: 's' });
}
