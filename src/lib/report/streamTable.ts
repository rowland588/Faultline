/* THE VALUE STREAM ON PAPER — docs/BUILD.md, B4; docs/REPORTS.md §1.
 *
 * The map's grid is read by colour and opened by a tap; paper cannot be
 * tapped, so the stream is the same facts as a table: a row per step in its
 * order — what is done, who, where, its value as the grid shows it (VA green,
 * NE amber, NV red — Rowland's own colours for the method, always with the
 * letters beside them), its work, the wait after it and the lead time by the
 * end of it — then the totals. A step a fix or a countermeasure was raised
 * from says so under its name (the branch off the step); a step carried from
 * the map before says it was not walked again. Rows break between pages,
 * never inside one, the header drawn again overleaf (blocks.rows).
 *
 * The words are worked out in lib/ie/steps (streamRows); this only draws. */
import type { StreamRow } from '../../tools/valuestream/steps';
import { INK, INK2, LINE, MUTED } from '../reportKit';
import { font, rows, text, wrap, SIZE, type Row } from './blocks';
import type { Block, Frame } from './flow';

/** The method's three colours — the same as the grid's (styles.css --vs-*). */
const VALUE: Record<NonNullable<StreamRow['value']>, { fill: string; ink: string; code: string }> = {
  adds: { fill: '#2f9d58', ink: '#ffffff', code: 'VA' },
  needed: { fill: '#e6b236', ink: INK, code: 'NE' },
  waste: { fill: '#d4524b', ink: '#ffffff', code: 'NV' },
};

const T = 8;           // the table's type size
const LH = 10;         // its line height
/** Column x offsets from the left, and widths; "what" takes what is left. */
const cols = (w: number) => {
  const fixed = { n: 16, who: 80, where: 68, value: 30, work: 72, wait: 40, lead: 44 };
  const what = Math.max(110, w - (fixed.n + fixed.who + fixed.where + fixed.value + fixed.work + fixed.wait + fixed.lead));
  const x = { n: 0, what: fixed.n, who: fixed.n + what, where: 0, value: 0, work: 0, wait: 0, lead: 0 };
  x.where = x.who + fixed.who; x.value = x.where + fixed.where; x.work = x.value + fixed.value;
  x.wait = x.work + fixed.work; x.lead = x.wait + fixed.wait;
  return { x, what, ...fixed };
};

function parts(f: Frame, r: StreamRow) {
  const c = cols(f.w);
  return {
    c,
    what: wrap(f.doc, r.what, c.what - 6, T, 'bold'),
    branch: r.branch ? wrap(f.doc, `Being made better: ${r.branch}`, c.what - 6, T - 0.5) : [],
    who: wrap(f.doc, r.who, c.who - 6, T),
    where: wrap(f.doc, r.where, c.where - 6, T),
    work: wrap(f.doc, r.work, c.work - 4, T),
  };
}

/** A step's row: its tallest cell, the branch under its name counted. */
function rowH(f: Frame, r: StreamRow): number {
  const p = parts(f, r);
  return 5 + Math.max(p.what.length + p.branch.length, p.who.length, p.where.length, p.work.length, 1) * LH + 3;
}

/** The table, and over it — when any step is carried from before — the one
 *  line that says which, so a row never grows a word for it. */
export function streamBlocks(list: StreamRow[], total: { work: string; wait: string; lead: string }): Block[] {
  const carried = list.filter(r => r.carried).map(r => r.n);
  const said = carried.length === list.length ? 'Every step is carried from the map before — not walked again yet; their figures are the old ones, in grey.'
    : carried.length ? `Step${carried.length === 1 ? '' : 's'} ${listOf(carried)} carried from the map before — not walked again yet; ${carried.length === 1 ? 'its figures are' : 'their figures are'} the old ones, in grey.` : '';
  return [...(said ? [text({ text: said, size: SIZE.tiny + 0.5, colour: MUTED, after: 3 })] : []), streamTable(list, total)];
}

const listOf = (ns: number[]): string => (ns.length < 2 ? String(ns[0] ?? '') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);

function streamTable(list: StreamRow[], total: { work: string; wait: string; lead: string }): Block {
  const header: Row = {
    h: () => 14,
    draw: (f, y) => {
      const { x } = cols(f.w);
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      const head: [string, number, boolean?][] = [['#', x.n], ['What is done', x.what], ['Who', x.who], ['Where', x.where], ['Value', x.value],
        ['Work', x.work], ['Wait', x.wait], ['Lead time', f.w, true]];
      for (const [t, at, right] of head) f.doc.text(t.toUpperCase(), f.x + at, y + 9, right ? { align: 'right' } : undefined);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 12.5, f.x + f.w, y + 12.5);
    },
  };
  const body: Row[] = list.map(r => ({
    h: f => rowH(f, r),
    draw: (f, y) => {
      const p = parts(f, r), { x } = p.c, ty = y + 5 + T * 0.92;
      font(f.doc, T, 'normal', MUTED); f.doc.text(String(r.n), f.x + x.n, ty);
      font(f.doc, T, 'bold', INK); f.doc.text(p.what, f.x + x.what, ty);
      if (p.branch.length) { font(f.doc, T - 0.5, 'normal', INK2); f.doc.text(p.branch, f.x + x.what, ty + p.what.length * LH); }
      font(f.doc, T, 'normal', INK2); f.doc.text(p.who, f.x + x.who, ty); f.doc.text(p.where, f.x + x.where, ty);
      /* the value as the grid shows it — its colour, its letters on it */
      if (r.value) {
        const v = VALUE[r.value];
        f.doc.setFillColor(v.fill); f.doc.roundedRect(f.x + x.value, y + 4, 22, 9, 1.5, 1.5, 'F');
        font(f.doc, SIZE.tiny, 'bold', v.ink); f.doc.text(v.code, f.x + x.value + 11, y + 10.6, { align: 'center' });
      } else { font(f.doc, T, 'normal', MUTED); f.doc.text('—', f.x + x.value + 6, ty); }
      /* a step carried from before: its figures in grey — the old ones */
      font(f.doc, T, 'normal', r.carried ? MUTED : INK2); f.doc.text(p.work, f.x + x.work, ty);
      f.doc.text(r.wait, f.x + x.wait, ty);
      font(f.doc, T, 'bold', INK); f.doc.text(r.lead, f.x + f.w, ty, { align: 'right' });
      const h = rowH(f, r);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h - 0.5, f.x + f.w, y + h - 0.5);
    },
  }));
  const foot: Row = {
    h: () => 16,
    draw: (f, y) => {
      const { x } = cols(f.w), ty = y + 11;
      font(f.doc, T, 'bold', INK);
      f.doc.text('Total', f.x + x.what, ty);
      f.doc.text(total.work, f.x + x.work, ty); f.doc.text(total.wait, f.x + x.wait, ty);
      f.doc.text(total.lead, f.x + f.w, ty, { align: 'right' });
    },
  };
  return rows({ header, rows: [...body, foot], after: 's' });
}
