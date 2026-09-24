/* @vitest-environment jsdom
 *
 * THE client's WEEKLY REPORT. The thing Rowland sends out.
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
import {
  cardRowHeights, drawPaceReport, orderStrands, packCards, stackHeight, strandWord, strandsOf, strandsSay,
  type PaceReportData,
} from '../paceReportPdf';

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
    /* `lands` is the week the date falls in, and at most one per row carries it:
       the late one has no column left to print in, the undated one has no date,
       and the one already in needs none. */
    { what: 'Perforated film — 2kg, 60 micron', due: '18 Sep', here: false, late: 3,
      covered: [false, false, false, false], lands: [undefined, undefined, undefined, undefined] },
    { what: 'Perforated film — 1.25kg', due: '28 Sep', here: false,
      covered: [false, true, true, true], lands: [undefined, '28 Sep', undefined, undefined] },
    { what: 'Labels — export run', here: false,
      covered: [false, false, false, false], lands: [undefined, undefined, undefined, undefined] },
    { what: 'Sealing jaw — spare', here: true,
      covered: [true, true, true, true], lands: [undefined, undefined, undefined, undefined] },
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

/** A commissioning job's tests, n of them, alternating through all four
 *  outcomes. `long` gives every other one an expectation that wraps to three
 *  lines, which is what makes the cards different heights and therefore what
 *  makes the packing do any work at all. */
const trials = (n: number, long = false): NonNullable<PaceReportData['trials']> => ({
  planned: n, passed: 0, failed: 0, notRun: 0,
  rows: Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    /* EVERY THIRD ONE HANGS OFF THE ONE BEFORE IT, so the fixture produces real
       chains — a test, the fix that came out of it, and the re-test behind
       that — rather than n things that happen to be unrelated. */
    fromId: i % 3 === 0 ? undefined : `t${i - 1}`,
    kind: (i % 3 === 1 ? 'fix' : 'test') as 'test' | 'fix',
    ran: i % 4 !== 0,
    late: i % 5 === 0,
    title: `Seal integrity ${i + 1} — Finest Red 2kg`,
    machine: 'Ilapak flow wrapper', when: '21 Sept',
    passesIf: long && i % 2 === 0
      ? 'Run the BU at 75 packs a minute for a full hour on Finest Red 2kg with the new jaw profile, with no more than two stops, holding seal integrity at zero leaks in twenty and the checkweigher inside plus or minus one and a half grams across two hundred packs.'
      : 'Zero leaks in twenty packs.',
    withWhom: 'Ilapak UK', product: 'Finest Red 2kg',
    result: 'Three leaked in twenty.',
    outcome: (['planned', 'passed', 'failed', 'notRun'] as const)[i % 4],
    outcomeWord: 'Passed',
    verdict: 'It held for forty minutes and then drifted.',
    found: { written: 3, actioned: 1, undecided: 2 },
    next: { what: 'Re-cut the jaw profile', owner: 'Ilapak UK', due: '28 Sept', done: false, late: false },
    nextMore: 1,
    follows: i > 0 ? `Seal integrity ${i} — Finest Red 2kg` : undefined,
    ledTo: i % 3 === 0 ? [`Seal integrity ${i + 2} — Finest Red 2kg`] : [],
  })),
});

/** A timeline with `lanes` lanes of one row each. What matters here is only
 *  how tall it measures: the front page carries it under the tests when the
 *  two fit and gives it a sheet of its own when they do not, and that decision
 *  and the page count have to be the same decision. */
const plan = (lanes = 2, outstanding = 2): NonNullable<PaceReportData['plan']> => ({
  says: '27 days to go, with 4 things outstanding — none of it late.',
  slip: 'The date has moved 8 days from what was agreed.',
  counted: '2 of 5 done · 1 still ahead',
  axis: {
    from: '2026-09-01', to: '2026-11-01', today: 0.4,
    ticks: [{ at: 0, label: 'Sep' }, { at: 0.5, label: 'Oct' }],
    expected: { at: 0.8, label: 'At rate', when: '20 Oct' },
    agreed: { at: 0.68, label: 'Agreed', when: '12 Oct' },
  },
  lanes: Array.from({ length: lanes }, (_, i) => ({
    kind: (['test', 'fix', 'material', 'program', 'machine'] as const)[i % 5],
    label: `Lane ${i + 1}`,
    rows: [[{ kind: 'test' as const, at: 0.3, label: `Seal integrity ${i + 1}`, when: '21 Sep', tone: 'done' as const }]],
  })),
  outstanding: Array.from({ length: outstanding }, (_, i) => ({
    what: `Thing ${i + 1} still to run`, open: i + 1, late: 0, whose: 'Ilapak UK',
  })),
});

const data = (over: Partial<PaceReportData> = {}): PaceReportData => ({
  /* A tracker project by default — that is what every existing case is about.
     The commissioning shape is asserted by passing `tracker: false`. */
  tracker: true,
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
  /* THE COMMISSIONING SHAPE, where the front page is the tests. These are the
     cases the footer arithmetic had never seen: the sheets the tests need are
     no longer a boolean, they come out of how tall the cards measured, and a
     page count assembled from measurements is exactly the kind that drifts. */
  ['a commissioning job with three tests', { tracker: false, trials: trials(3) }],
  ['a commissioning job with one test', { tracker: false, trials: trials(1) }],
  ['a commissioning job with no tests booked yet', { tracker: false, trials: trials(0) }],
  ['enough tests to spill onto a second sheet', { tracker: false, trials: trials(14) }],
  ['enough tests to spill onto several', { tracker: false, trials: trials(60) }],
  ['tests whose expectations wrap, so no two cards are the same height',
    { tracker: false, trials: trials(24, true) }],
  ['spilling tests AND every optional sheet behind them',
    { tracker: false, trials: trials(30, true), pareto: pareto(), tree: tree(), board: board(4) }],
  /* WHERE THE JOB IS, WHICH NOW RIDES ON THE FRONT PAGE WHEN IT FITS. That is
     a page that exists or does not depending on two measurements, which is
     precisely the arithmetic the footer has drifted away from before. */
  ['a short plan and few tests — both on one sheet',
    { tracker: false, trials: trials(2), plan: plan(2, 2) }],
  ['a plan with nothing but one lane', { tracker: false, trials: trials(1), plan: plan(1, 0) }],
  ['a tall plan that cannot fit under the tests', { tracker: false, trials: trials(6), plan: plan(6, 6) }],
  ['enough tests to fill the front page, so the plan keeps its own sheet',
    { tracker: false, trials: trials(20, true), plan: plan(3, 3) }],
  ['a plan on a tracker project, which never merges',
    { tracker: true, plan: plan(3, 3) }],
  ['a plan, spilling tests and every optional sheet',
    { tracker: false, trials: trials(24, true), plan: plan(4, 4),
      pareto: pareto(), tree: tree(), board: board(3) }],
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

  /* WHERE THE JOB IS COSTS A SHEET ONLY WHEN IT CANNOT SHARE ONE.
     On a commissioning job with a handful of tests the front page used to stop
     two thirds of the way down and the position went on a sheet that was itself
     a third full — two short pages where one full one says more. */
  it('a short plan rides on the front page instead of costing a sheet', () => {
    const few = { tracker: false, trials: trials(2) };
    expect(pagesFor({ ...few, plan: plan(2, 2) })).toBe(pagesFor(few));
  });

  it('but a tall one still gets its own', () => {
    const few = { tracker: false, trials: trials(2) };
    expect(pagesFor({ ...few, plan: plan(14, 12) })).toBe(pagesFor(few) + 1);
  });

  it('and so does one on a page already full of tests', () => {
    const many = { tracker: false, trials: trials(20, true) };
    expect(pagesFor({ ...many, plan: plan(2, 2) })).toBe(pagesFor(many) + 1);
  });

  it('a tracker project never merges it — that front page is the numbers', () => {
    expect(pagesFor({ plan: plan(2, 2) })).toBe(pagesFor({}) + 1);
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

/* HOW THE TEST CARDS FALL ACROSS THE SHEETS.
 *
 * Rowland: "PDF messy because you are trying to put everything on one sheet —
 * the trials. Expand and make the PDF dynamic, it will grow, make use of the
 * space better."
 *
 * The cards used to be a fixed 122pt, so this arithmetic did not exist and the
 * page count could be a sum of booleans. Now the sheets a job needs come out of
 * how tall its cards measured — and the footer's "page 2 of 5" is computed from
 * the same numbers, which is why they are worth pinning down as numbers rather
 * than looking at a rendered sheet and deciding it seems about right.
 */
describe('the test cards across the sheets', () => {
  it('makes a row as tall as the taller of its pair, so the two share a bottom edge', () => {
    expect(cardRowHeights([100, 140, 90, 90], 2)).toEqual([140, 90]);
  });

  it('gives a card the whole width when the column count is one', () => {
    expect(cardRowHeights([100, 140], 1)).toEqual([100, 140]);
  });

  it('counts the gaps between rows, not after the last one', () => {
    expect(stackHeight([100, 100, 100])).toBe(324);   // 300 + two 12pt gaps
    expect(stackHeight([100])).toBe(100);
    expect(stackHeight([])).toBe(0);
  });

  it('fills the front panel, then a sheet at a time', () => {
    /* Eight cards of 100 in pairs: a row is 100, four rows plus gaps is 436.
       A 300pt front panel holds two rows; a 700pt sheet holds the rest. */
    expect(packCards(Array(8).fill(100), 2, 300, 700)).toEqual([4, 4]);
  });

  it('grows onto as many sheets as it takes, not one extra and then silence', () => {
    /* The fault this replaces: twenty tests printed six on the front and
       fourteen on ONE further sheet, of which the last eight fell off the
       bottom and were never seen again. */
    const pages = packCards(Array(40).fill(120), 2, 260, 260);
    expect(pages.reduce((a, b) => a + b, 0)).toBe(40);
    expect(pages.length).toBeGreaterThan(3);
  });

  it('never leaves a card unplaced, whatever the heights', () => {
    const heights = [80, 300, 95, 420, 110, 88, 260, 91, 77, 340, 102];
    const pages = packCards(heights, 2, 400, 700);
    expect(pages.reduce((a, b) => a + b, 0)).toBe(heights.length);
  });

  it('puts a card too tall for an empty sheet on one of its own rather than looping for ever', () => {
    /* Without the guard this is an infinite loop, which is the only way this
       can fail badly: the tab stops responding with no error to read. */
    expect(packCards([2000, 2000], 1, 400, 400)).toEqual([1, 1]);
  });

  it('says one empty page when there is nothing to place', () => {
    expect(packCards([], 2, 400, 700)).toEqual([0]);
  });
});

/* ================== THE TESTS, GROUPED INTO WHAT THEY PROVE ==================
 *
 * Rowland: "when I look at the PDF I see just loads of things on it. What we
 * really should say is — this is the trial that took place, these are the
 * things that are connected to that trial, because there can be multiple
 * trials. We need to show the STORY, not just information."
 *
 * So the unit of the report is no longer a test. It is a STRAND: one thing the
 * job set out to prove, and every attempt at it. Which record belongs with
 * which is now an argument the page makes, and an argument is worth asserting
 * as data rather than looking at a sheet and deciding it seems about right.
 */
type Row = NonNullable<PaceReportData['trials']>['rows'][number];

const row = (o: Partial<Row> & { id: string }): Row => ({
  kind: 'test', late: false, ran: (o.outcome ?? 'planned') !== 'planned', title: `Test ${o.id}`, machine: 'Ilapak flow wrapper',
  when: '21 Sept', passesIf: 'Zero leaks in twenty.', withWhom: 'Ilapak UK',
  product: 'Finest Red 2kg', result: '', outcome: 'planned', outcomeWord: 'Planned',
  verdict: 'Not run yet', found: { written: 0, actioned: 0, undecided: 0 },
  nextMore: 0, ledTo: [], ...o,
});

describe('grouping the tests into what they prove', () => {
  it('keeps a test, its fix and its re-test as ONE thing being proved', () => {
    const st = strandsOf([
      row({ id: 'a', title: 'Seal integrity', outcome: 'failed' }),
      row({ id: 'b', fromId: 'a', kind: 'fix', title: 'Re-cut the jaw', outcome: 'passed' }),
      row({ id: 'c', fromId: 'b', title: 'Seal integrity — re-test' }),
    ]);
    expect(st).toHaveLength(1);
    expect(st[0]!.name).toBe('Seal integrity');
    expect(st[0]!.steps).toHaveLength(3);
  });

  it('numbers the ATTEMPTS and does not number the fixes between them', () => {
    const st = strandsOf([
      row({ id: 'a', outcome: 'failed' }),
      row({ id: 'b', fromId: 'a', kind: 'fix' }),
      row({ id: 'c', fromId: 'b' }),
    ]);
    expect(st[0]!.steps.map(s => s.n)).toEqual([1, undefined, 2]);
    /* Two are numbered; one has happened. "2 attempts" over a run and a
       booking read as two runs. */
    expect(st[0]!.attempts).toBe(1);
  });

  it('reads the chain in the order the work happened, not the order stored', () => {
    const st = strandsOf([
      row({ id: 'c', fromId: 'a', when: '28 Sept', title: 'third' }),
      row({ id: 'a', when: '21 Sept', title: 'first' }),
      row({ id: 'b', fromId: 'a', when: '24 Sept', title: 'second' }),
    ]);
    expect(st[0]!.steps.map(s => s.when)).toEqual(['21 Sept', '24 Sept', '28 Sept']);
  });

  it('never loses a record whose parent is not in this report', () => {
    /* A test planned off one that was deleted, or that belongs to another
       line. Hanging it off nothing would drop it from the page altogether,
       which is the one fault this must not have. */
    const st = strandsOf([row({ id: 'a', fromId: 'gone' })]);
    expect(st).toHaveLength(1);
    expect(st[0]!.name).toBe('Test a');
  });

  it('treats every unconnected test as its own thing to prove', () => {
    expect(strandsOf([row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' })])).toHaveLength(3);
  });
});

describe('where a strand has got to', () => {
  const state = (rows: Row[]) => strandsOf(rows)[0]!.state;

  it('is proved when the latest attempt passed', () => {
    expect(state([row({ id: 'a', outcome: 'failed' }),
      row({ id: 'b', fromId: 'a', outcome: 'passed' })])).toBe('proved');
  });

  it('is not yet when it failed and a re-test is booked', () => {
    expect(state([row({ id: 'a', outcome: 'failed' }),
      row({ id: 'b', fromId: 'a', outcome: 'planned' })])).toBe('notYet');
  });

  it('is NOT PROVED when it failed and nothing is booked behind it', () => {
    expect(state([row({ id: 'a', outcome: 'failed' })])).toBe('notProved');
  });

  it('is booked when nothing has run at all', () => {
    expect(state([row({ id: 'a', outcome: 'planned' })])).toBe('booked');
  });

  it('a test that ran with no verdict is not proved, and the client is owed the call', () => {
    /* The live fault: a result typed on the floor, no Passed/Didn't pass
       tapped. The strand must not read it as still booked. */
    const st = strandsOf([row({ id: 'a', ran: true, outcome: 'planned',
      verdict: 'Started at 73%, achieved 90% over a 97 min run', outcomeWord: 'No verdict yet' })]);
    expect(st[0]!.state).toBe('notProved');
    expect(st[0]!.attempts).toBe(1);
    expect(st[0]!.owed.map(o => o.what)).toEqual(['Say whether it passed']);
    /* The verdict is the SITE's debt, not the OEM's: withWhom is who we ran
       it with. It printed "Say whether it passed · Ilapak UK". */
    expect(st[0]!.owed[0]).toMatchObject({ owner: 'the site', since: true });
  });

  it('counts attempts as days that happened — one run and one booked is one attempt', () => {
    const st = strandsOf([row({ id: 'a', outcome: 'failed' }), row({ id: 'b', fromId: 'a', outcome: 'planned' })]);
    expect(st[0]!.attempts).toBe(1);
  });

  it('a fix on its own is DONE when it is done, not BOOKED', () => {
    const [guard] = strandsOf([row({ id: 'g', kind: 'fix', title: 'Guard on the infeed shelf', outcome: 'passed' })]);
    expect(guard).toMatchObject({ kind: 'fix', state: 'proved', owed: [] });
    expect(strandWord({ kind: 'fix', state: 'proved' })).toBe('DONE');
  });

  it('a booked re-test carries its OWN date and lateness, not its parent\u2019s', () => {
    const st = strandsOf([
      row({ id: 'a', outcome: 'failed', late: true, when: '17 Sept',
        next: { what: 'Reject confirmation — re-test', owner: 'Ishida Europe', due: '26 Sept', done: false, late: false } }),
      row({ id: 'b', fromId: 'a', title: 'Reject confirmation — re-test', when: '26 Sept', late: false }),
    ]);
    expect(st.map(x => x.owed)).toEqual([[{ what: 'Reject confirmation — re-test', owner: 'Ilapak UK', due: '26 Sept', late: false }]]);
  });

  it('a done fix does not make it proved — only a passing test does', () => {
    /* A fix is work towards the answer, not the answer. A strand whose fix is
       done and whose re-test has not run is not proved, and saying otherwise
       on a client report is the worst thing this page could do. */
    expect(state([row({ id: 'a', outcome: 'failed' }),
      row({ id: 'b', fromId: 'a', kind: 'fix', outcome: 'passed' })])).toBe('notProved');
  });
});

describe('what is still owed on a strand', () => {
  it('does not say the strand\u2019s own name back under its own heading', () => {
    const st = strandsOf([row({ id: 'a', title: 'Changeover', outcome: 'notRun' })]);
    expect(st[0]!.owed[0]!.what).toBe('Run it');
  });

  it('carries the date and whether it has gone', () => {
    const st = strandsOf([row({ id: 'a', outcome: 'notRun', when: '17 Sept', late: true })]);
    expect(st[0]!.owed[0]).toMatchObject({ due: '17 Sept', late: true, owner: 'Ilapak UK' });
  });

  it('does not list the same job twice when a booked re-test is also the next step', () => {
    const st = strandsOf([
      row({ id: 'a', outcome: 'failed', next: { what: 'Seal integrity — re-test', owner: 'Ilapak UK', due: '28 Sept', done: false, late: false } }),
      row({ id: 'b', fromId: 'a', title: 'Seal integrity — re-test', when: '28 Sept' }),
    ]);
    expect(st[0]!.owed.map(o => o.what)).toEqual(['Seal integrity — re-test']);
  });

  it('says nothing is owed on one that is finished', () => {
    expect(strandsOf([row({ id: 'a', outcome: 'passed' })])[0]!.owed).toEqual([]);
  });
});

describe('the order a presentation reads in', () => {
  it('leads with what needs attention and finishes with what is done', () => {
    const st = orderStrands(strandsOf([
      row({ id: 'p', title: 'proved', outcome: 'passed' }),
      row({ id: 'b', title: 'booked', outcome: 'planned' }),
      row({ id: 'n', title: 'not proved', outcome: 'failed' }),
      row({ id: 'y1', title: 'not yet', outcome: 'failed' }),
      row({ id: 'y2', fromId: 'y1', outcome: 'planned' }),
    ]));
    expect(st.map(s => s.state)).toEqual(['notProved', 'notYet', 'booked', 'proved']);
  });

  it('puts what is owed soonest first within the same state', () => {
    const st = orderStrands(strandsOf([
      row({ id: 'a', title: 'later', outcome: 'planned', when: '2026-10-06' }),
      row({ id: 'b', title: 'sooner', outcome: 'planned', when: '2026-09-28' }),
    ]));
    expect(st.map(s => s.name)).toEqual(['sooner', 'later']);
  });
});

describe('what the section says about itself', () => {
  it('counts the things being proved, not the records behind them', () => {
    /* Three records — a test, its fix, its re-test — are ONE thing to prove.
       The tiles above this section count the same way, because a page whose
       two halves disagree about how big the job is has already lost. */
    const st = strandsOf([
      row({ id: 'a', outcome: 'failed' }),
      row({ id: 'b', fromId: 'a', kind: 'fix', outcome: 'passed' }),
      row({ id: 'c', fromId: 'b', outcome: 'planned' }),
    ]);
    expect(strandsSay(st)).toBe('1 thing to prove · 1 not yet');
  });

  it('says plainly when there is nothing', () => {
    expect(strandsSay([])).toBe('nothing booked yet');
  });
});
