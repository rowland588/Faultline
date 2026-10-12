/* THE CHANGEOVER ON PAPER — docs/TOOLKIT.md tool 6, "a page"; docs/REPORTS.md §1.
 *
 * The screen's split bar is read by its fill; the paper says the same
 * figures as a table and in words: a row per step in its order — what is
 * done, its side (internal: the line stopped; external: could be done while
 * it runs), its minutes, how it is known — the totals, then the two bars as
 * sentences (the minutes now, with the external work moved out, what a week
 * buys back; over or within the agreed standard) and the interval's line. A
 * step a fix or a countermeasure was raised from says so under its name (the
 * branch off the step); a step carried from the changeover before is said in
 * one line over the table and its figures are grey (the old ones). Rows break
 * between pages, never inside one, the header drawn again overleaf
 * (blocks.rows).
 *
 * The words are worked out in lib/ie/changeover (changeoverSheet); this only
 * draws. No colour: the side is said in words, as the screen's fill is. */
import type { ChangeoverSheet } from '../ie/changeover';
import { INK, INK2, LINE, MUTED } from '../reportKit';
import { font, rows, text, wrap, SIZE, type Row } from './blocks';
import type { Block, Frame } from './flow';

const T = 8;           // the table's type size
const LH = 10;         // its line height
/** Column x offsets from the left, and widths; "name" takes what is left. */
const cols = (w: number) => {
  const fixed = { n: 16, side: 58, minutes: 60, how: 96 };
  const name = Math.max(140, w - (fixed.n + fixed.side + fixed.minutes + fixed.how));
  const x = { n: 0, name: fixed.n, side: fixed.n + name, minutes: fixed.n + name + fixed.side, how: fixed.n + name + fixed.side + fixed.minutes };
  return { x, name, ...fixed };
};

type R = ChangeoverSheet['rows'][number];

function parts(f: Frame, r: R) {
  const c = cols(f.w);
  return {
    c,
    name: wrap(f.doc, r.name, c.name - 6, T, 'bold'),
    branch: r.branch ? wrap(f.doc, `Being made better: ${r.branch}`, c.name - 6, T - 0.5) : [],
    how: wrap(f.doc, r.how, c.how - 2, T),
  };
}

function rowH(f: Frame, r: R): number {
  const p = parts(f, r);
  return 5 + Math.max(p.name.length + p.branch.length, p.how.length, 1) * LH + 3;
}

const listOf = (ns: number[]): string => (ns.length < 2 ? String(ns[0] ?? '') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);

/** The table, the line over it when steps are carried, and the figures in
 *  words under it — those the study's own sentence above the table (`said`)
 *  does not already say, so nothing is printed twice. */
export function changeoverBlocks(sheet: ChangeoverSheet, said0 = ''): Block[] {
  const lines = sheet.lines.filter(l => !said0.includes(l));
  const carried = sheet.rows.filter(r => r.carried).map(r => r.n);
  const said = !carried.length ? '' : carried.length === sheet.rows.length
    ? 'Every step is carried from the changeover before — not timed again yet; their figures are the old ones, in grey.'
    : `Step${carried.length === 1 ? '' : 's'} ${listOf(carried)} carried from the changeover before — not timed again yet; ${carried.length === 1 ? 'its figure is' : 'their figures are'} the old one${carried.length === 1 ? '' : 's'}, in grey.`;
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
      const head: [string, number][] = [['#', x.n], ['Step', x.name], ['Side', x.side], ['Minutes', x.minutes], ['How known', x.how]];
      for (const [t, at] of head) f.doc.text(t.toUpperCase(), f.x + at, y + 9);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 12.5, f.x + f.w, y + 12.5);
    },
  };
  const body: Row[] = sheet.rows.map(r => ({
    h: f => rowH(f, r),
    draw: (f, y) => {
      const p = parts(f, r), { x } = p.c, ty = y + 5 + T * 0.92;
      font(f.doc, T, 'normal', MUTED); f.doc.text(String(r.n), f.x + x.n, ty);
      font(f.doc, T, 'bold', INK); f.doc.text(p.name, f.x + x.name, ty);
      if (p.branch.length) { font(f.doc, T - 0.5, 'normal', INK2); f.doc.text(p.branch, f.x + x.name, ty + p.name.length * LH); }
      /* a step carried from before: its figures in grey — the old ones */
      font(f.doc, T, r.side === 'I' ? 'bold' : 'normal', r.carried ? MUTED : INK2); f.doc.text(r.side === 'I' ? 'Internal' : 'External', f.x + x.side, ty);
      font(f.doc, T, 'normal', r.carried ? MUTED : INK2); f.doc.text(r.minutes, f.x + x.minutes, ty);
      font(f.doc, T, 'normal', MUTED); f.doc.text(p.how, f.x + x.how, ty);
      const h = rowH(f, r);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h - 0.5, f.x + f.w, y + h - 0.5);
    },
  }));
  /* the totals: the whole, and its two sides, in the wide column — measured, so it wraps rather than runs off */
  const footLines = (f: Frame) => wrap(f.doc, `Total — ${sheet.total.internal} internal, ${sheet.total.external} external`, cols(f.w).name - 6, T, 'bold');
  const foot: Row = {
    h: f => 6 + footLines(f).length * LH + 2,
    draw: (f, y) => {
      const { x } = cols(f.w), ty = y + 6 + T * 0.92;
      font(f.doc, T, 'bold', INK);
      f.doc.text(footLines(f), f.x + x.name, ty);
      f.doc.text(sheet.total.minutes, f.x + x.minutes, ty);
    },
  };
  return rows({ header, rows: [...body, foot], after: 's' });
}
