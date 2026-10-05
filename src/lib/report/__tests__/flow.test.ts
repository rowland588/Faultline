/* THE ENGINE'S RULES, HELD OVER THOUSANDS OF REPORTS NOBODY HAND-PICKED.
 *
 * Rowland, 4 October: "how do you know that you built it correctly ... that
 * it will work every single time?" Three sample jobs show it works on three.
 * This pours thousands of random reports — headings, paragraphs of any
 * length, tables of 1 to 120 rows of any height, boxes taller than a page,
 * landscape inserts — through the real engine and the real blocks, into a
 * stand-in document that records every line and row drawn and the page it
 * landed on, and checks the rules of docs/REPORTS.md §2 on every one:
 *
 *   1  nothing runs past the foot of a page (unless one thing that cannot
 *      be split is itself taller than a page)
 *   2  every line and row is drawn exactly once — nothing lost, nothing twice
 *   3  in the order given
 *   4  a heading is never the last thing on a page
 *   5  a table never leaves one row alone either side of a break, when the
 *      page had room to avoid it
 *   6  no blank page
 *   7  measuring (the dry run) and drawing agree on the page count
 *   8  a floating insert (the plan) goes at a break the flow makes anyway:
 *      every page breaks exactly where it would with the insert taken out
 *
 * A fixed seed, so a failure is the same failure every run. */
import { describe, expect, it } from 'vitest';
import type { jsPDF } from 'jspdf';
import { pour, type Block, type Frame } from '../flow';
import { box, heading, pagesOf, rows, text, type Row } from '../blocks';

/* ------------------------------ the stand-in ------------------------------ */

type Mark = { id: string; page: number; top: number; bottom: number; kind: 'line' | 'row' | 'box' | 'head' | 'insert' };

class Paper {
  page = 1;
  marks: Mark[] = [];
  size = 10;
  /** A doc as far as the blocks use one: it measures text and records it. */
  doc = {
    setFont: () => undefined, setTextColor: () => undefined, setDrawColor: () => undefined,
    setLineWidth: () => undefined, line: () => undefined, setFillColor: () => undefined,
    setFontSize: (s: number) => { this.size = s; },
    // ~0.5 em per character, broken at spaces, a word longer than the line kept whole
    splitTextToSize: (t: string, w: number) => {
      const per = Math.max(1, Math.floor(w / (this.size * 0.5)));
      const out: string[] = [];
      let cur = '';
      for (const word of t.split(' ')) {
        if (!cur) cur = word;
        else if ((cur + ' ' + word).length <= per) cur += ' ' + word;
        else { out.push(cur); cur = word; }
      }
      if (cur) out.push(cur);
      return out;
    },
    getTextWidth: (t: string) => t.length * this.size * 0.5,
    text: (t: string | string[], _x: number, y: number) => {
      // Every tag on the line is recorded — a line can carry several short ones.
      for (const s of Array.isArray(t) ? t : [t]) {
        for (const id of s.split(' ').filter(w => /^[LH]\d+$/.test(w))) {
          this.marks.push({ id, page: this.page, top: y - this.size, bottom: y + this.size * 0.25, kind: id.startsWith('H') ? 'head' : 'line' });
        }
      }
    },
  } as unknown as jsPDF;
}

/* -------------------------- random reports, seeded ------------------------- */

let seed = 1;
/** How often a row is tall (150–400pt) — raised in the second pass to push
 *  the breaks into the awkward cases. */
let tallRows = 0.05;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

interface Spec { blocks: Block[]; ids: string[]; boxes: Map<string, number>; summary: string[]; table: Map<string, number>; floats: Set<string> }

function randomReport(p: Paper, pageH: number): Spec {
  const blocks: Block[] = [], ids: string[] = [], boxes = new Map<string, number>(), summary: string[] = [];
  const table = new Map<string, number>(), floats = new Set<string>();
  let n = 0;
  const id = (k: string) => `${k}${n++}`;
  const count = int(1, 30);
  for (let i = 0; i < count; i++) {
    const r = rnd();
    if (r < 0.18) {
      const h = id('H'); ids.push(h);
      blocks.push(heading(`${h} ${'word '.repeat(int(0, 12))}`.trim())); summary.push(h);
    } else if (r < 0.45) {
      // A paragraph: every line starts with its own id so each can be traced.
      const lines = int(1, 90);
      const t = Array.from({ length: lines }, () => { const l = id('L'); ids.push(l); return `${l} ${'x'.repeat(int(20, 60))}`; }).join(' ');
      blocks.push(text({ text: t, size: 10 })); summary.push(`text×${lines}`);
    } else if (r < 0.75) {
      const rowsN = int(1, 120);
      const list: Row[] = Array.from({ length: rowsN }, () => {
        const rid = id('R'); ids.push(rid); table.set(rid, i);
        // Now and then a row taller than a whole page — the one thing allowed to run to the foot.
        const x = rnd();
        const h = x < 0.01 ? int(760, 900) : x < tallRows ? int(150, 400) : int(10, 60);
        return { h: () => h, draw: (_f: Frame, y: number) => { p.marks.push({ id: rid, page: p.page, top: y, bottom: y + h, kind: 'row' }); } };
      });
      const header: Row | undefined = rnd() < 0.5 ? { h: () => 13, draw: () => undefined } : undefined;
      blocks.push(rows({ header, rows: list })); summary.push(`rows×${rowsN}${header ? '+head' : ''}`);
    } else if (r < 0.9) {
      const bid = id('B'); ids.push(bid);
      const h = rnd() < 0.08 ? int(pageH + 1, pageH * 1.5) : int(5, 300);
      boxes.set(bid, h);
      blocks.push(box(() => h, (_f, y) => { p.marks.push({ id: bid, page: p.page, top: y, bottom: y + h, kind: 'box' }); })); summary.push(`box ${h}`);
    } else if (blocks.length > 0) {
      // A report starts with something that flows (its title); never with pages of its own.
      const iid = id('I'); ids.push(iid);
      const fl = rnd() < 0.5;
      if (fl) floats.add(iid);
      blocks.push(pagesOf(() => { p.page++; p.marks.push({ id: iid, page: p.page, top: 0, bottom: 0, kind: 'insert' }); }, { float: fl })); summary.push(`insert${fl ? ' float' : ''}`);
    }
  }
  return { blocks, ids, boxes, summary, table, floats };
}

/* --------------------------------- the run --------------------------------- */

describe('the report engine, on 4000 random reports', () => {
  it.each([['ordinary rows', 0.05, 1000], ['mostly tall rows', 0.45, 50000]])('keeps every rule on every one — %s', async (_name, tall, base) => {
    tallRows = tall as number;
    const failures: string[] = [];
    for (let run = 0; run < 2000; run++) {
      seed = (base as number) + run;
      const p = new Paper();
      const top = 36, bottom = 786, pageH = bottom - top;
      const f: Frame = { doc: p.doc, x: 36, w: 523, top, bottom, density: run % 2 ? 'compact' : 'comfortable', dry: false };
      const spec = randomReport(p, pageH);
      // The dry run first, on the same blocks — measuring must not change them.
      const dry = await pour({ ...f, dry: true }, spec.blocks, () => undefined);
      const startPages = p.page;
      const real = await pour(f, spec.blocks, () => { p.page++; });
      const fail = (why: string) => failures.push(`run ${run} (seed ${(base as number) + run}): ${why}`);

      // 1 — nothing past the foot
      for (const m of p.marks) {
        if (m.kind === 'insert') continue;
        const tooTall = m.kind === 'box' && (spec.boxes.get(m.id) ?? 0) > pageH;
        if (m.bottom > bottom + 0.5 && !tooTall && !(m.kind === 'row' && m.bottom - m.top > pageH)) fail(`${m.id} runs past the foot (${Math.round(m.bottom)} > ${bottom})`);
      }
      // 2 & 3 — each once, in order (an insert that floated may move later)
      const drawn = p.marks.map(m => m.id);
      const seen = new Map<string, number>();
      for (const d of drawn) seen.set(d, (seen.get(d) ?? 0) + 1);
      for (const i of spec.ids) if ((seen.get(i) ?? 0) !== 1) fail(`${i} drawn ${seen.get(i) ?? 0} times`);
      const order = drawn.filter(d => !d.startsWith('I'));
      const want = spec.ids.filter(d => !d.startsWith('I'));
      if (order.join() !== want.join()) fail('drawn out of order');
      // 4 — a heading is not the last thing on its page when something follows
      const byPage = new Map<number, Mark[]>();
      for (const m of p.marks) byPage.set(m.page, [...(byPage.get(m.page) ?? []), m]);
      const lastMark = p.marks[p.marks.length - 1];
      for (const [pg, ms] of byPage) {
        const last = ms[ms.length - 1];
        if (last.kind === 'head' && last !== lastMark) {
          const next = p.marks[p.marks.indexOf(last) + 1];
          // Unavoidable only when what follows is one unsplittable thing taller than a page less the heading.
          // …or a first row or box that could never share a page with the headings above it.
          const headsAbove = ms.filter(m => m.kind === 'head').reduce((a, m) => a + (m.bottom - m.top) + 26, 0);
          const nextTooTall = (next?.kind === 'box' && (spec.boxes.get(next.id) ?? 0) > pageH - 40)
            || (!!next && (next.kind === 'row' || next.kind === 'box') && (next.bottom - next.top) + headsAbove > pageH - 13);
          if (next && next.kind !== 'insert' && !nextTooTall) fail(`heading ${last.id} ends page ${pg}`);
        }
      }
      // 5 — no single row stranded when the page could have avoided it
      for (const [pg, ms] of byPage) {
        const rowsHere = ms.filter(m => m.kind === 'row');
        if (rowsHere.length !== 1 || ms.length !== 1) continue;
        const r = rowsHere[0];
        const i = spec.ids.indexOf(r.id);
        const prev = spec.ids[i - 1], next = spec.ids[i + 1];
        // A neighbour in the same table, parted from it by the break.
        const neighbourRow = (x?: string) => !!x && x.startsWith('R') && spec.table.get(x) === spec.table.get(r.id) && p.marks.find(m => m.id === x)?.page !== pg;
        // Avoidable only if it and the row it was parted from could have shared a page (with a header).
        const hOf = (x?: string) => { const m = p.marks.find(mm => mm.id === x); return m ? m.bottom - m.top : 0; };
        const couldShare = (x?: string) => neighbourRow(x) && (r.bottom - r.top) + hOf(x) + 13 <= pageH;
        /* A fault only if a better arrangement existed: it could have shared
           with the row after it, or taken the row before it without leaving
           that page with a single row of the table. With rows this tall some
           row is alone somewhere; moving one back would only strand another. */
        const prevPageRows = prev ? p.marks.filter(m => m.kind === 'row' && spec.table.get(m.id) === spec.table.get(r.id) && m.page === p.marks.find(mm => mm.id === prev)?.page).length : 0;
        if (couldShare(next) || (couldShare(prev) && prevPageRows >= 3)) fail(`row ${r.id} alone on page ${pg}`);
      }
      // 6 — no blank page: every page from the first to the last holds something
      const last = Math.max(...p.marks.map(m => m.page), 1);
      if (spec.ids.length) for (let pg = 1; pg <= last; pg++) if (!byPage.has(pg)) fail(`page ${pg} is blank`);
      // 7 — measuring and drawing agree
      const flowPages = real.pages;
      if (dry.pages !== flowPages) fail(`dry run said ${dry.pages} pages, drawing made ${flowPages}`);
      if (startPages !== 1) fail('the dry run drew');
      // 8 — the floating inserts move no break: pour again without them and compare
      const floats = spec.blocks.filter(b => b.insert && b.float);
      if (floats.length) {
        const marks = p.marks;
        const floatIds = new Set(marks.filter(m => m.kind === 'insert' && spec.floats.has(m.id)).map(m => m.id));
        const flowPage = (m: Mark) => m.page - marks.filter(x => floatIds.has(x.id) && x.page < m.page).length;
        const was = new Map(marks.filter(m => m.kind !== 'insert').map(m => [m.id, flowPage(m)]));
        p.marks = []; p.page = 1;
        await pour(f, spec.blocks.filter(b => !floats.includes(b)), () => { p.page++; });
        const moved = p.marks.find(m => m.kind !== 'insert' && was.get(m.id) !== m.page);
        if (moved) fail(`a floating insert moved ${moved.id} from page ${moved.page} to ${was.get(moved.id)}`);
        p.marks = marks;
      }
      if (failures.length > 12) break;
    }
    expect(failures).toEqual([]);
  }, 60_000);
});

/* THE CASES A RANDOM RUN REACHES RARELY, each on purpose. */
describe('the report engine, at its edges', () => {
  const run = async (blocks: (p: Paper) => Block[]) => {
    const p = new Paper();
    const f: Frame = { doc: p.doc, x: 36, w: 523, top: 36, bottom: 786, density: 'comfortable', dry: false };
    await pour(f, blocks(p), () => { p.page++; });
    return p;
  };
  const row = (p: Paper, id: string, h: number): Row => ({ h: () => h, draw: (_f, y) => { p.marks.push({ id, page: p.page, top: y, bottom: y + h, kind: 'row' }); } });

  it('a table whose first row is tall starts on a fresh page and never runs off it', async () => {
    const p = await run(p => [rows({ rows: [row(p, 'a', 500), row(p, 'b', 400), row(p, 'c', 20), row(p, 'd', 20)] })]);
    expect(p.marks.every(m => m.bottom <= 786.5)).toBe(true);
    expect(p.marks.map(m => m.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('a row taller than a page is drawn once, on a page of its own', async () => {
    const p = await run(p => [box(() => 100, () => p.marks.push({ id: 'top', page: p.page, top: 36, bottom: 136, kind: 'box' })), rows({ rows: [row(p, 'big', 900), row(p, 'next', 20)] })]);
    const big = p.marks.find(m => m.id === 'big');
    const next = p.marks.find(m => m.id === 'next');
    expect(big?.top).toBe(36);
    expect(p.marks.filter(m => m.id === 'big')).toHaveLength(1);
    // …and what follows it starts the next page, rather than being drawn below it off the sheet.
    expect(next?.page).toBe((big?.page ?? 0) + 1);
    expect(next?.top).toBe(36);
  });

  it('a heading before something too tall to start here moves with it', async () => {
    const p = await run(p => [box(() => 600, () => p.marks.push({ id: 'filler', page: p.page, top: 36, bottom: 636, kind: 'box' })), heading('H1 Fixes'), rows({ rows: Array.from({ length: 30 }, (_, i) => row(p, `r${i}`, 30)) })]);
    const h = p.marks.find(m => m.id === 'H1');
    const first = p.marks.find(m => m.id === 'r0');
    expect(h?.page).toBe(first?.page);
  });

  it('an empty block draws nothing and takes no room', async () => {
    const p = await run(() => [text({ text: '' }), rows({ rows: [] }), heading('H1 Only')]);
    expect(p.marks.map(m => m.id)).toEqual(['H1']);
  });

  it('a section that runs over a page says whose it is at the top of the next — once, and not on its first page', async () => {
    const p = await run(p => {
      const cont = heading('H9 Problem 1 (continued)');
      const lines = Array.from({ length: 120 }, (_, i) => `L${i} ${'x'.repeat(40)}`).join(' ');
      return [
        box(() => 300, () => p.marks.push({ id: 'filler', page: p.page, top: 36, bottom: 336, kind: 'box' })),
        heading('H1 Problem 1'),
        { ...text({ text: lines, size: 10 }), runHead: cont },
        { ...rows({ rows: Array.from({ length: 40 }, (_, i) => row(p, `r${i}`, 30)) }), runHead: cont },
        heading('H2 The board'),
        rows({ rows: Array.from({ length: 40 }, (_, i) => row(p, `b${i}`, 30)) }),
      ];
    });
    const heads = p.marks.filter(m => m.id === 'H9');
    // Each page the section runs onto opens with the continued heading, and only those pages.
    const pagesOfSection = [...new Set(p.marks.filter(m => /^(L\d+|r\d+)$/.test(m.id)).map(m => m.page))];
    expect(heads.map(m => m.page)).toEqual(pagesOfSection.slice(1));
    for (const h of heads) expect(h.top).toBeLessThan(60);   // the first thing on its page
    // The board that follows never carries it.
    const boardPages = new Set(p.marks.filter(m => /^b\d+$/.test(m.id)).map(m => m.page));
    expect(heads.some(h => boardPages.has(h.page) && !pagesOfSection.includes(h.page))).toBe(false);
  });

  it('a section that fits a page starts on a fresh one rather than breaking — when the page it leaves is a quarter used', async () => {
    const section = (p: Paper, k: string): Block[] => [
      { ...heading(`H${k} Problem`), keep: () => 400 },
      box(() => 360, () => p.marks.push({ id: `fish${k}`, page: p.page, top: 0, bottom: 0, kind: 'box' })),
    ];
    // 500 used of 750: the 400 does not fit, and the page is well used — it moves.
    const moved = await run(p => [box(() => 500, () => p.marks.push({ id: 'a', page: p.page, top: 36, bottom: 536, kind: 'box' })), ...section(p, '1')]);
    expect(moved.marks.find(m => m.id === 'H1')?.page).toBe(2);
    expect(moved.marks.find(m => m.id === 'fish1')?.page).toBe(2);
    // 100 used: moving would leave a near-empty page, so it does not.
    const stays = await run(p => [box(() => 100, () => p.marks.push({ id: 'a', page: p.page, top: 36, bottom: 136, kind: 'box' })), ...section(p, '2'),
      text({ text: Array.from({ length: 60 }, (_, i) => `L${i}`).join(' '), size: 10 })]);
    expect(stays.marks.find(m => m.id === 'H2')?.page).toBe(1);
  });
});
