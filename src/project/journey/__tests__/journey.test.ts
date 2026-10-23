/* THE JOURNEY — a project between two dates, day by day (docs/JOURNEY.md, J1).
 *
 * Rowland, 23 October: "pick a range of reporting period ... from this date
 * to that date ... collate all the information between them two dates ...
 * the entire history ... it's the journey." The range is a lens: every line
 * is a record's own date, nothing is stored for it, and the same records
 * read over a week, two weeks, one day and the whole history. */
import { describe, expect, it } from 'vitest';
import {
  MOST_DAYS, RANGE_PICKS, daysOf, journeyClosing, journeyOf, journeyTiles, pickOf, rangeLabel, rangeOf, slideRange, toolPlansOf,
  type JourneyInput,
} from '../journey';
import type { DayInput } from '../../../lib/day';
import type { Asset, Test, TestItem } from '../../../lib/testing';
import type { PaceTodoRow } from '../../../db/rows';
import type { RegisterProblem } from '../../../lib/projectActions';
import { encodeScope } from '../../../lib/noteScope';

const TODAY = '2026-10-21'; // a Wednesday
const at = (iso: string) => new Date(`${iso}T10:00:00`).getTime();
let n = 0;
const packer: Asset = { id: 'a1', projectId: 'p', name: 'Case packer', oem: 'Brillopak', state: 'onSite', onSiteOn: '2026-10-13', dueOn: '2026-10-13', sort: 1, updatedAt: 1 };
const rec = (o: Partial<Test> & { title: string }): Test =>
  ({ id: `t${++n}`, projectId: 'p', outcome: 'planned', sort: n, createdAt: at('2026-10-01'), updatedAt: 1, ...o });
const air = rec({ kind: 'install', title: 'Air and power connected', assetId: packer.id, withWhom: 'Brillopak', plannedFor: '2026-10-19', ranOn: '2026-10-19', outcome: 'passed' });
const seal = rec({ title: 'Seal integrity', withWhom: 'Ilapak UK', plannedFor: '2026-10-20', ranOn: '2026-10-20', outcome: 'failed', result: '3 leaks in 20' });
const dry = rec({ kind: 'install', title: 'Dry run', assetId: packer.id, withWhom: 'Brillopak', plannedFor: '2026-10-23' });
const perf = rec({ title: 'Performance run', plannedFor: '2026-10-27', plannedTo: '2026-10-29' });
const gate: DayInput = { tests: [air, seal, dry, perf], items: [], assets: [packer], materials: [], programs: [] };

const step = (o: Partial<PaceTodoRow> & { what: string }): PaceTodoRow =>
  ({ id: `s${++n}`, projectId: 'p', where: '', why: '', who: '', when: '', state: 'todo', createdAt: at('2026-10-01'), updatedAt: at('2026-10-01'), ...o });
const steps: PaceTodoRow[] = [
  step({ what: 'Time the changeover on Line 7', who: 'Priya', tool: 'changeover', due: '2026-10-22' }),
  step({ what: 'Count a shift at the wrapper', who: 'Lee', tool: 'losses', due: '2026-10-16', state: 'done', doneOn: '2026-10-16', outcome: '85 min lost, 9 slow running' }),
  step({ what: 'Order the new jaws', who: 'Tanya', due: '2026-10-20' }),
  step({ what: 'Brief the night shift', who: '', due: '2026-10-30' }),
  step({ what: 'An older plan for the same tool', tool: 'changeover', due: '2026-10-15', updatedAt: at('2026-09-30') }),
];
const register: RegisterProblem[] = [
  { id: 'sn1', problem: 'Coder misprints the date', priority: 'high', owner: 'Tanya', raisedAt: at('2026-10-14'), dueAt: at('2026-10-21'), status: 'open', projectId: 'p' },
  { id: 'sn2', problem: 'Guard loose', priority: 'low', raisedAt: at('2026-10-10'), closedAt: at('2026-10-20'), status: 'closed', projectId: 'p' },
];
const note = (date: string, what: string, when: string): TestItem =>
  ({ id: `n${++n}`, projectId: 'p', testId: encodeScope({ kind: 'day', date }), kind: 'note', what, sort: n, createdAt: at(when), updatedAt: 1 });
const notes: TestItem[] = [
  note('2026-10-20', 'Seal failures traced to the jaw temperature; new jaws ordered.', '2026-10-20'),
  note('2026-10-20', 'Second thought, written later.', '2026-10-21'),
  note('2026-10-03', 'Outside the week.', '2026-10-03'),
  { id: 'n0', projectId: 'p', testId: 'gate:setup', kind: 'note', what: 'A note about Set up — not commentary', sort: 1, createdAt: at('2026-10-20'), updatedAt: 1 },
];
const input: JourneyInput = { gate, steps, register, notes };

describe('the range', () => {
  it('the one-tap ranges — this week, this and next, last week, since the start, dates — from a Wednesday', () => {
    expect(RANGE_PICKS.map(p => p.label)).toEqual(['This week', 'This week and next', 'Last week', 'Since the start', 'Pick dates']);
    expect(rangeOf('thisWeek', TODAY)).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(rangeOf('thisAndNext', TODAY)).toEqual({ from: '2026-10-19', to: '2026-11-01' });
    expect(rangeOf('lastWeek', TODAY)).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    /* the whole history: from the project's first day to a week ahead */
    expect(rangeOf('sinceStart', TODAY, '2026-09-01')).toEqual({ from: '2026-09-01', to: '2026-10-28' });
    /* no start known: this week */
    expect(rangeOf('sinceStart', TODAY)).toEqual({ from: '2026-10-19', to: '2026-10-28' });
    /* two dates, the wrong way round put right */
    expect(rangeOf('dates', TODAY, undefined, { from: '2026-10-30', to: '2026-10-01' })).toEqual({ from: '2026-10-01', to: '2026-10-30' });
    expect(rangeOf('dates', TODAY, undefined, { from: '2026-10-05' })).toEqual({ from: '2026-10-05', to: '2026-11-01' });
  });
  it('a range is never longer than two years — a year typed wrong makes no thousand days', () => {
    const r = rangeOf('dates', TODAY, undefined, { from: '2016-01-01', to: '2026-10-21' });
    expect(daysOf(r).length).toBe(MOST_DAYS);
    expect(r.to).toBe('2026-10-21');
  });
  it('says which pick a range is, slides by its own length, and is said as a person says it', () => {
    expect(pickOf({ from: '2026-10-19', to: '2026-11-01' }, TODAY)).toBe('thisAndNext');
    expect(pickOf({ from: '2026-10-19', to: '2026-10-30' }, TODAY)).toBe('dates');
    expect(slideRange({ from: '2026-10-19', to: '2026-11-01' }, 1)).toEqual({ from: '2026-11-02', to: '2026-11-15' });
    expect(slideRange({ from: '2026-10-19', to: '2026-10-25' }, -1)).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    expect(rangeLabel({ from: '2026-10-19', to: '2026-11-01' }, TODAY)).toBe('Mon 19 Oct – Sun 1 Nov');
    expect(rangeLabel({ from: '2026-12-28', to: '2027-01-03' }, TODAY)).toBe('Mon 28 Dec 2026 – Sun 3 Jan 2027');
    expect(rangeLabel({ from: '2026-10-21', to: '2026-10-21' }, TODAY)).toBe('Wed 21 Oct');
    expect(daysOf({ from: '2026-10-19', to: '2026-10-21' })).toEqual(['2026-10-19', '2026-10-20', '2026-10-21']);
  });
});

describe('this week and next, day by day', () => {
  const j = journeyOf(input, rangeOf('thisAndNext', TODAY), TODAY);
  const day = (d: string) => j.days.find(x => x.date === d);
  const texts = (d: string) => day(d)?.lines.map(l => l.text) ?? [];

  it('only the days with something on them, in order, the rest counted once', () => {
    expect(j.days.map(d => d.date)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-29', '2026-10-30']);
    expect(j.skipped).toBe(14 - 7);
    expect(day('2026-10-19')).toMatchObject({ label: 'Mon 19 Oct', past: true, today: false });
    expect(day('2026-10-21')).toMatchObject({ past: false, today: true });
  });

  it('a day gone says what got done and what did not go to plan, in the day’s own words — and the problem closed', () => {
    expect(texts('2026-10-19')).toEqual(['Case packer — Air and power connected — done (Brillopak).']);
    expect(texts('2026-10-20')).toEqual([
      'Seal integrity — didn’t pass (Ilapak UK).',
      'Order the new jaws — was due and not done (Tanya).',
      'Problem closed: Guard loose.',
    ]);
    const seal20 = day('2026-10-20')?.lines[0];
    expect(seal20).toMatchObject({ tone: 'bad', detail: '3 leaks in 20', id: seal.id });
    expect(day('2026-10-20')?.lines[1]).toMatchObject({ kind: 'Action', tone: 'slipped', who: 'Tanya', stepId: steps[2].id });
    expect(day('2026-10-20')?.lines[2]).toMatchObject({ kind: 'Problem', tone: 'done', snagId: 'sn2' });
  });

  it('today says what is due today and what is past its day — the action and the problem alike', () => {
    expect(texts('2026-10-21')).toEqual([
      'Order the new jaws (Tanya) — was due 20 Oct.',
      'SMED: An older plan for the same tool — was due 15 Oct.',
      'High · Coder misprints the date (Tanya).',
    ]);
    expect(day('2026-10-21')?.lines.map(l => l.tone)).toEqual(['slipped', 'slipped', 'booked']);
  });

  it('a day ahead says what is due on it — a tool plan in the tool’s word, a test by its name, a window on its last day only', () => {
    expect(texts('2026-10-22')).toEqual(['SMED: Time the changeover on Line 7 (Priya).']);
    expect(day('2026-10-22')?.lines[0]).toMatchObject({ kind: 'Tool plan — SMED', tone: 'booked', who: 'Priya' });
    expect(texts('2026-10-23')).toEqual(['Case packer — Dry run (Brillopak).']);
    /* the performance run is booked Tue–Thu: due on the Thursday, said once — not "under way" on each day of its window */
    expect(day('2026-10-27')).toBeUndefined();
    expect(texts('2026-10-29')).toEqual(['Performance run — since Tue 27 Oct.']);
    expect(texts('2026-10-30')).toEqual(['Brief the night shift.']);
  });

  it('the commentary sits on its day, oldest first — a note on a gate is not commentary', () => {
    expect(day('2026-10-20')?.commentary.map(c => c.what)).toEqual([
      'Seal failures traced to the jaw temperature; new jaws ordered.', 'Second thought, written later.',
    ]);
    expect(j.days.flatMap(d => d.commentary).some(c => c.what.startsWith('A note about'))).toBe(false);
    expect(j.days.flatMap(d => d.commentary).some(c => c.what === 'Outside the week.')).toBe(false);
  });

  it('counts done · still to do · late · planned, and says them in the tiles and the closing line', () => {
    /* done: the install step, the problem closed; wrong: the failed test, the slipped action on the 20th;
       today: two actions past their day (late, still to do) and the problem due today (still to do);
       ahead: the tool plan, the dry run, the performance run, the briefing */
    expect(j.counts).toEqual({ done: 2, toDo: 3, late: 2, planned: 4, wrong: 2 });
    const tiles = journeyTiles(j, TODAY);
    expect(tiles.map(t => [t.k, t.v])).toEqual([['Done', '2'], ['Still to do', '3'], ['Late', '2'], ['Planned', '4']]);
    expect(tiles[0].of).toBe('in the range · 2 did not go to plan');
    expect(tiles[1].tone).toBe('r');
    expect(journeyClosing(j, 'Line 7 pace', TODAY)).toEqual({ text: 'Line 7 pace, Mon 19 Oct – Sun 1 Nov: 2 done, 3 still to do (2 late), 4 planned.', tone: 'r' });
  });
});

describe('the same records through other lenses', () => {
  it('last week: the tool plan done with what came of it, the problem raised; nothing ahead', () => {
    const j = journeyOf(input, rangeOf('lastWeek', TODAY), TODAY);
    expect(j.days.map(d => d.date)).toEqual(['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);
    expect(j.days[3].lines[0]).toMatchObject({ text: 'Loss count: Count a shift at the wrapper — done (Lee).', detail: '85 min lost, 9 slow running', tone: 'done', kind: 'Tool plan — Loss count' });
    expect(j.days[1].lines[0]).toMatchObject({ text: 'Problem raised: High · Coder misprints the date (Tanya).', tone: 'found' });
    expect(j.days[2].lines[0]).toMatchObject({ text: 'SMED: An older plan for the same tool — was due and not done.', tone: 'slipped' });
    expect(j.counts).toEqual({ done: 2, toDo: 0, late: 0, planned: 0, wrong: 1 });
    const tiles = journeyTiles(j, TODAY);
    expect(tiles[3]).toMatchObject({ v: '0', of: 'the range has gone by', tone: 'n' });
    expect(journeyClosing(j, 'Line 7 pace', TODAY).text).toBe('Line 7 pace, Mon 12 Oct – Sun 18 Oct: 2 done, nothing still to do.');
  });

  it('one day: the 20th alone', () => {
    const j = journeyOf(input, { from: '2026-10-20', to: '2026-10-20' }, TODAY);
    expect(j.days.length).toBe(1);
    expect(j.days[0].lines.length).toBe(3);
    expect(j.days[0].commentary.length).toBe(2);
    expect(j.skipped).toBe(0);
  });

  it('the whole history: everything above, in one order, the note from the 3rd on its day', () => {
    const j = journeyOf(input, rangeOf('sinceStart', TODAY, '2026-10-01'), TODAY);
    expect(j.range).toEqual({ from: '2026-10-01', to: '2026-10-28' });
    expect(j.days.map(d => d.date)).toEqual(['2026-10-03', '2026-10-10', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
    expect(j.days[0].commentary[0].what).toBe('Outside the week.');
    expect(j.days[0].lines).toEqual([]);
    expect(j.counts).toEqual({ done: 4, toDo: 3, late: 2, planned: 2, wrong: 3 });
  });

  it('a range with nothing in it says so', () => {
    const j = journeyOf(input, { from: '2027-03-01', to: '2027-03-07' }, TODAY);
    expect(j.days).toEqual([]);
    expect(j.skipped).toBe(7);
    expect(journeyClosing(j, 'Line 7 pace', TODAY)).toEqual({ text: 'Line 7 pace, Mon 1 Mar 2027 – Sun 7 Mar 2027: nothing recorded.', tone: 'n' });
  });

  it('a project with no gate reads its board and register alone, a study by the day it measured', () => {
    const j = journeyOf({ steps, register, studies: [
      { id: 'st1', tool: 'capability', name: 'Weight 400 g', projectId: 'p', facts: { readings: [{ at: at('2026-10-15'), v: 401 }, { at: at('2026-10-15'), v: 399, who: 'Priya' }] }, uses: [], startedAt: at('2026-10-15'), updatedAt: 1 } as never,
    ] }, rangeOf('lastWeek', TODAY), TODAY);
    /* the study is read by the day's own rules (lib/day), as a stage-gate project's is */
    const d15 = j.days.find(d => d.date === '2026-10-15');
    expect(d15?.lines.map(l => l.kind)).toContain('Tool plan — SMED');
    const study = d15?.lines.find(l => /Weight 400 g/.test(l.text));
    expect(study?.text).toMatch(/Weight 400 g: 2 readings taken by Priya/);
    expect(study?.href).toBe('/capability/st1');
  });

  it('a long range stays quick — two years of days in well under a second', () => {
    const t0 = performance.now();
    const j = journeyOf(input, rangeOf('dates', TODAY, undefined, { from: '2024-10-21', to: '2026-10-21' }), TODAY);
    expect(daysOf(j.range).length).toBe(MOST_DAYS);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

describe('the tools we will use', () => {
  it('one plan a tool — the latest where there are several — in the catalogue’s order, with what for, who, when, done', () => {
    const plans = toolPlansOf(steps);
    expect(plans.map(p => [p.tool, p.name, p.what, p.who, p.due, p.done])).toEqual([
      ['changeover', 'SMED', 'Time the changeover on Line 7', 'Priya', '2026-10-22', false],
      ['losses', 'Loss count', 'Count a shift at the wrapper', 'Lee', '2026-10-16', true],
    ]);
    expect(plans[1].doneOn).toBe('2026-10-16');
  });
  it('nothing planned is an empty list, never a row', () => {
    expect(toolPlansOf([step({ what: 'No tool' })])).toEqual([]);
  });
});

describe('this week and next, in one line', () => {
  it('says done · still to do (late) · planned from the same reading, in the tone of the worst of it', async () => {
    const { weekLine } = await import('../journey');
    const w = weekLine(input, TODAY, '2026-10-01');
    expect(w).toEqual({ text: 'This week and next: 2 done · 3 still to do (2 late) · 4 planned.', tone: 'r', range: { from: '2026-10-19', to: '2026-11-01' } });
    expect(weekLine({ steps: [] }, TODAY).text).toBe('This week and next: 0 done · nothing still to do · 0 planned.');
    expect(weekLine({ steps: [] }, TODAY).tone).toBe('n');
  });
});
