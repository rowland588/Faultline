/* @vitest-environment jsdom
 *
 * THE GM's WEEKLY REPORT. The thing Rowland sends out.
 *
 * Its page count is assembled twice: once as a NUMBER stamped on page 1 —
 * "page 1 of 5" — and once as a sequence of addPage calls whose conditions have
 * to match that number exactly. Those two have already drifted apart once, and a
 * four-page report went out stamped "page 2 of 3". Nothing in the file can catch
 * that: both halves look right on their own.
 *
 * So the invariant here is the one that binds them. Every page stamp must agree
 * with every other, the highest must equal the real page count, and each page
 * must be stamped exactly once. Then the footer cannot lie about the document it
 * is printed on, whichever combination of optional sheets the week produces.
 *
 * The data is fully typed with no casts. Twice while testing the commissioning
 * report I built fixtures that lied to the compiler and then chased the runtime
 * failures as if they were app bugs.
 */
import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { drawPaceReport, type PaceReportData } from '../paceReportPdf';

type Board = PaceReportData['board'];
type Tree = PaceReportData['tree'];
type Pareto = NonNullable<PaceReportData['pareto']>;

/* A line with the series the chart actually takes: a measure, its readings by
   date, the period in play and every period's target. Built here rather than
   imported from the app so the drawer's contract is what is under test. */
const measure = { id: 'm1', name: 'Packs per minute', unit: 'ppm', direction: 'up' as const, sort: 10 };
const q1 = { id: 'p1', name: 'Q1', from: '2026-08-01', to: '2026-10-31', sort: 10 };

const line = (key: string): PaceReportData['lines'][number] => ({
  key, name: `Line ${key}`, variant: 'A', owner: 'Dave', sponsor: 'Rowland',
  series: {
    measure, period: q1, target: 60,
    points: [
      { at: '2026-08-03', value: 52 }, { at: '2026-08-10', value: 55 },
      { at: '2026-08-24', value: 58 }, { at: '2026-08-31', value: 61 },
    ],
    across: [{ name: 'Q1', value: 60 }, { name: 'Q2', value: 65 },
             { name: 'Q3', value: 70 }, { name: 'Q4', value: 75 }],
    latest: 61, margin: 1, meeting: true,
  },
});

/* What the job is waiting on, in the shape the sheet is drawn from: a row per
   thing, one flag per week. One of every state — in stock, late, on its way,
   and nobody has given a date — because each one draws differently. */
const materials = (): NonNullable<PaceReportData['materials']> => ({
  total: 4, here: 1, waiting: 3, late: 1, nextDue: '2026-09-28',
  weeks: [
    { start: '2026-09-21', label: 'WK3', month: 'September' },
    { start: '2026-09-28', label: 'WK4', month: 'September' },
    { start: '2026-10-05', label: 'WK1', month: 'October' },
    { start: '2026-10-12', label: 'WK2', month: 'October' },
  ],
  rows: [
    { what: 'Perforated film — 2kg, 60 micron', due: '18 Sep', here: false, late: 3, covered: [false, false, false, false] },
    { what: 'Perforated film — 1.25kg', due: '28 Sep', here: false, covered: [false, true, true, true] },
    { what: 'Labels — export run', here: false, covered: [false, false, false, false] },
    { what: 'Sealing jaw — spare', here: true, covered: [true, true, true, true] },
  ],
});

const byLine = (name: string): PaceReportData['byLine'][number] => ({
  name, owner: 'Dave', open: 4, late: 1, done: 6, total: 10,
  nextOpen: 2, nextDone: 1, snags: 3, wins: 1, latest: 61, meeting: true, unit: 'ppm',
});

/** n areas, each with three pillars' worth of actions. More areas means more
 *  board sheets, which is the multi-sheet footer case. */
const board = (areas: number, perPillar = 4): Board =>
  Array.from({ length: areas }).flatMap((_, a) =>
    (['people', 'plant', 'process'] as const).flatMap(pillar =>
      Array.from({ length: perPillar }, (_, i): Board[number] => ({
        area: `Area ${a + 1}`, pillar,
        title: `${pillar} action ${i + 1} on area ${a + 1}`,
        owner: 'Dave', due: '2026-10-02', rag: 'a',
      }))));

const tree = (): Tree => [
  { id: 'r', text: 'Output', rag: 'g', sort: 0 },
  { id: 'a', parentId: 'r', text: 'Availability', rag: 'a', sort: 0 },
  { id: 'p', parentId: 'r', text: 'Performance', rag: 'r', sort: 1 },
  { id: 'a1', parentId: 'a', text: 'Changeover time', rag: 'a', sort: 0 },
];

const pareto = (): Pareto => ({
  period: '14 Jul – 6 Aug 2026', beforePeriod: '16 Jun – 13 Jul 2026',
  headline: '# 1 loss is Changeover, at 1,200 minutes.',
  totalMins: 3638, totalStops: 398, vitalCount: 3, vitalShare: 0.81, comparable: true,
  rows: [
    { category: 'Changeover', mins: 1200, share: 0.33, events: 100, minPerEvent: 12, vital: true, move: 'down 12%', verdict: 'down' },
    { category: 'Breakdown', mins: 900.5, share: 0.25, events: 90, minPerEvent: 10, vital: true, move: 'about the same', verdict: 'flat' },
    { category: 'Material', mins: 600, share: 0.16, events: 120, minPerEvent: 5, vital: true, move: 'up 8%', verdict: 'up' },
  ],
  more: 25, gone: ['Sensor fault'],
});

const data = (over: Partial<PaceReportData> = {}): PaceReportData => ({
  now: Date.parse('2026-09-19T09:00:00Z'),
  title: 'Project Pace', lead: 'Rowland', leadRole: 'Project lead',
  subtitle: 'Week 38 — four lines, two at target',
  lines: [line('2'), line('7')],
  atTarget: 1, pctDone: 0.42, complete: 12, total: 28,
  openTotal: 16, openOnTrack: 11, late: 5,
  openSnags: 6, winsThisWeek: 2,
  byLine: [byLine('Line 2'), byLine('Line 7'), { ...byLine('Cellox'), noLine: true, latest: null, meeting: undefined, unit: undefined }],
  materials: materials(),
  lateActions: [{ line: 'Line 7', what: 'align the former roller', owner: 'Dave', due: '2026-09-05' }],
  lateMore: 3,
  todos: [{ state: 'todo', what: 'order the film', who: 'Dave', when: 'Friday' }],
  completed: [{ what: 'replaced the sensor', who: 'Dave', outcome: 'stopped the false trips' }],
  completedMore: 1,
  snags: [{ problem: 'guard rattles', owner: 'Dave', days: 12, status: 'open', line: 'Line 7' }],
  wins: [{ title: 'faster changeover', impact: '44 → 49 ppm', story: 'new sequence', who: 'Dave', where: 'Line 7', verdict: 'proven' }],
  board: [], boardUnplaced: 0,
  tree: [],
  ...over,
});

/** Draw the report, recording every string it stamps, so the footers can be read
 *  back without parsing a PDF. */
function render(d0: PaceReportData) {
  const d = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  const said: string[] = [];
  const realText = d.text.bind(d);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrow shim over jsPDF's overloaded text()
  (d as any).text = (t: unknown, ...rest: unknown[]) => {
    if (typeof t === 'string') said.push(t);
    else if (Array.isArray(t)) said.push(...t.filter((x): x is string => typeof x === 'string'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ditto
    return (realText as any)(t, ...rest);
  };

  drawPaceReport(d, d0);
  const buf = d.output('arraybuffer');

  const stamps = said
    .map(s => /page (\d+) of (\d+)/.exec(s))
    .filter((m): m is RegExpExecArray => !!m)
    .map(m => ({ page: Number(m[1]), of: Number(m[2]) }));

  return {
    pages: d.getNumberOfPages(),
    head: new TextDecoder().decode(new Uint8Array(buf).slice(0, 5)),
    bytes: buf.byteLength,
    stamps,
    said,
  };
}

const SHAPES: [string, Partial<PaceReportData>][] = [
  ['the bare minimum — no Pareto, no tree, no board', {}],
  ['a Pareto and nothing else', { pareto: pareto() }],
  ['a lever tree and nothing else', { tree: tree() }],
  ['a board of one area', { board: board(1) }],
  ['a board big enough to need several sheets', { board: board(9) }],
  ['everything at once', { pareto: pareto(), tree: tree(), board: board(4) }],
  ['everything, with a board over several sheets', { pareto: pareto(), tree: tree(), board: board(12) }],
  ['no lines at all — a project on its first day', { lines: [], byLine: [] }],
];

describe('the footer never lies about the document it is printed on', () => {
  for (const [what, over] of SHAPES) {
    it(what, () => {
      const r = render(data(over));

      expect(r.head).toBe('%PDF-');
      expect(r.stamps.length, 'no page stamp was drawn at all').toBeGreaterThan(0);

      // every stamp agrees on the total
      const totals = [...new Set(r.stamps.map(s => s.of))];
      expect(totals, 'two footers disagree about how many pages there are').toHaveLength(1);

      // and that total is the truth
      expect(totals[0], 'the footer total is not the real page count').toBe(r.pages);

      // every page stamped exactly once, 1..N, no gaps and no repeats
      const numbered = r.stamps.map(s => s.page).sort((a, b) => a - b);
      expect(numbered).toEqual(Array.from({ length: r.pages }, (_, i) => i + 1));
    });
  }
});

describe('the optional sheets each cost exactly one page', () => {
  const pagesFor = (over: Partial<PaceReportData>) => render(data(over)).pages;

  it('a Pareto adds one', () => {
    expect(pagesFor({ pareto: pareto() })).toBe(pagesFor({}) + 1);
  });

  it('a lever tree adds one', () => {
    expect(pagesFor({ tree: tree() })).toBe(pagesFor({}) + 1);
  });

  it('what we are waiting on adds one', () => {
    // the base fixture carries it, so this removes it rather than adding it
    expect(pagesFor({ materials: undefined })).toBe(pagesFor({}) - 1);
  });

  it('an EMPTY materials list adds none — a grid of nothing is not a page', () => {
    const none = { total: 0, here: 0, waiting: 0, late: 0, weeks: [], rows: [] };
    expect(pagesFor({ materials: none })).toBe(pagesFor({ materials: undefined }));
  });

  it('an empty board adds none — an absent sheet must not be counted', () => {
    // The stamp is 2 + pareto + tree + boardPlan.length while the pages drawn are
    // guarded on data.board.length. They only agree because boardSheets returns
    // no sheets for no areas; if that ever returned one empty sheet instead, the
    // footer would promise a page that does not exist.
    expect(pagesFor({ board: [] })).toBe(pagesFor({}));
  });

  it('a bigger board costs more sheets, and the footer keeps up', () => {
    const small = render(data({ board: board(1) }));
    const large = render(data({ board: board(12) }));
    expect(large.pages).toBeGreaterThan(small.pages);
    expect(large.stamps.every(s => s.of === large.pages)).toBe(true);
  });
});

describe('the report carries its content', () => {
  it('names the project and its lead rather than a hard-coded title', () => {
    const r = render(data({ title: 'Line 2 commissioning', lead: 'Rowland' }));
    expect(r.said.join(' | ')).toContain('Line 2 commissioning');
  });

  it('prints an area the tracker carries that no line answers for', () => {
    // Line 4 and Cellox were invisible in the roll-up: the columns only a line
    // can fill are empty by nature, and dropping the row hid the area entirely.
    const r = render(data());
    expect(r.said.join(' | ')).toContain('Cellox');
  });

  it('survives text no PDF font can render', () => {
    const r = render(data({
      wins: [{ title: 'faster 😀', impact: '44 → 49 ppm ✓', story: 'log\nover two lines',
               who: 'Dave', where: 'Line 7', verdict: 'proven' }],
      snags: [{ problem: 'NUL\u0000inside', owner: 'Dave', days: 3, status: 'open', line: 'Line 7' }],
    }));
    expect(r.head).toBe('%PDF-');
    expect(r.stamps.every(s => s.of === r.pages)).toBe(true);
  });
});
