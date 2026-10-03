/* A BOX WHOSE COLOUR FOLLOWS A NUMBER.
 *
 * The lever tree's colours are typed by the person holding the pen — except
 * where a box is bound to one of the project's measures on one of its lines.
 * Then the colour is the line's latest reading against the target for the
 * period that reading falls in: at or better than target is green, behind it
 * red, nothing to judge by grey. Three things are worth pinning down:
 *
 *   WHICH WAY IS GOOD comes off the measure, never assumed. 1.8% waste against
 *   a 2% target is green; 61 ppm against 60 is green; 2.4% waste is red.
 *
 *   NO TARGET IS NOT A MISS. A reading with nothing to judge it against, or no
 *   reading at all, is grey and says so in words — not red.
 *
 *   A NUMBER BINDING BRINGS NO WORK. A binding that names only a measure must
 *   never be read as "every action on the board": the work half of a binding
 *   needs a line, and the two halves come apart independently.
 */
import { describe, it, expect } from 'vitest';
import {
  boundNumber, statusOfNumber, numberWords, numberFigure, numberChoices,
  bindsWork, bindsNumber, withoutNumber, withoutWork,
  withTrackerRows, bindSources, bindCount, unplacedActions, statusOfTodo,
  type NumberSources, type TrackerBind,
} from '../treeBind';
import type { Measure, Period, Reading, Target } from '../measures';
import type { PaceLineRow, PaceTodoRow, TreeNodeRow } from '../../db';
import type { PaceAction } from '../tracker';

const ppm: Measure = { id: 'm-ppm', name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 10 };
const waste: Measure = { id: 'm-waste', name: 'Waste', unit: '%', direction: 'down', sort: 20 };
const q1: Period = { id: 'q1', name: 'Q1', from: '2026-08-01', to: '2026-10-31', sort: 10 };
const q2: Period = { id: 'q2', name: 'Q2', from: '2026-11-01', to: '2027-01-31', sort: 20 };
const LINE = 'line-2b';

const target = (measureId: string, periodId: string, value: number, lineId = LINE): Target =>
  ({ id: `t-${measureId}-${periodId}`, projectId: 'p', lineId, measureId, periodId, value, updatedAt: 0 });
const reading = (measureId: string, at: string, value: number, createdAt = 0, lineId = LINE): Reading =>
  ({ id: `r-${measureId}-${at}-${createdAt}`, projectId: 'p', lineId, measureId, at, value, createdAt, updatedAt: 0 });

const src = (readings: Reading[], targets: Target[] = [target('m-ppm', 'q1', 44), target('m-waste', 'q1', 2)]): NumberSources =>
  ({ measures: [ppm, waste], periods: [q1, q2], targets, readings });

const bind: TrackerBind = { measureId: 'm-ppm', lineId: LINE };

describe('the colour a number gives a box', () => {
  it('at or better than target is green, and says the figure', () => {
    const n = boundNumber(bind, src([reading('m-ppm', '2026-09-01', 52)]));
    expect(n?.status).toBe('g');
    expect(n?.figure).toBe('52 vs 44 ppm');
    expect(n?.words).toBe('On target');
    expect(n?.period?.name).toBe('Q1');
    expect(boundNumber(bind, src([reading('m-ppm', '2026-09-01', 44)]))?.status).toBe('g');
  });

  it('behind target is red', () => {
    const n = boundNumber(bind, src([reading('m-ppm', '2026-09-01', 40)]));
    expect(n?.status).toBe('r');
    expect(n?.words).toBe('Behind target');
    expect(n?.figure).toBe('40 vs 44 ppm');
  });

  it('respects which way is good: less waste beats the target, more misses it', () => {
    const w = { measureId: 'm-waste', lineId: LINE };
    expect(boundNumber(w, src([reading('m-waste', '2026-09-01', 1.8)]))?.status).toBe('g');
    expect(boundNumber(w, src([reading('m-waste', '2026-09-01', 2.4)]))?.status).toBe('r');
    expect(boundNumber(w, src([reading('m-waste', '2026-09-01', 2.4)]))?.figure).toBe('2.4 vs 2 %');
  });

  it('judges the LATEST reading, against the target for the period it falls in', () => {
    const n = boundNumber(bind, src(
      [reading('m-ppm', '2026-09-01', 30), reading('m-ppm', '2026-11-05', 52)],
      [target('m-ppm', 'q1', 44), target('m-ppm', 'q2', 55)],
    ));
    expect(n?.period?.name).toBe('Q2');
    expect(n?.target).toBe(55);
    expect(n?.status).toBe('r');
    expect(n?.figure).toBe('52 vs 55 ppm');
  });

  it('two readings on one day: the one written later wins', () => {
    const n = boundNumber(bind, src([reading('m-ppm', '2026-09-01', 30, 1), reading('m-ppm', '2026-09-01', 50, 2)]));
    expect(n?.latest).toBe(50);
    expect(n?.status).toBe('g');
  });

  it('nothing measured is grey, in words', () => {
    const n = boundNumber(bind, src([]));
    expect(n?.status).toBe('n');
    expect(n?.words).toBe('Nothing measured yet');
    expect(n?.figure).toBe('Packs per minute · nothing measured yet');
  });

  it('no target for that period is grey, not red — and still shows the number', () => {
    // a reading between two periods has nothing to be judged against
    const gap = boundNumber(bind, src([reading('m-ppm', '2026-07-15', 52)]));
    expect(gap?.status).toBe('n');
    expect(gap?.words).toBe('No target set');
    expect(gap?.figure).toBe('52 ppm');
    // a period with no target row for this line
    const none = boundNumber(bind, src([reading('m-ppm', '2026-09-01', 52)], []));
    expect(none?.status).toBe('n');
  });

  it('a reading on another line does not count', () => {
    const n = boundNumber(bind, src([reading('m-ppm', '2026-09-01', 99, 0, 'line-7')]));
    expect(n?.status).toBe('n');
  });

  it('is nothing at all for a box that is not bound, has no numbers, or names a measure the project lost', () => {
    expect(boundNumber(undefined, src([]))).toBeUndefined();
    expect(boundNumber({ line: '2B' }, src([]))).toBeUndefined();
    expect(boundNumber(bind, undefined)).toBeUndefined();
    expect(boundNumber({ measureId: 'gone', lineId: LINE }, src([]))).toBeUndefined();
  });

  it('the pure pieces agree with the whole', () => {
    const s = { measure: ppm, latest: reading('m-ppm', '2026-09-01', 52), target: 44, meeting: true };
    expect(statusOfNumber(s)).toBe('g');
    expect(numberWords(s)).toBe('On target');
    expect(numberFigure(s)).toBe('52 vs 44 ppm');
    expect(statusOfNumber({ ...s, meeting: false })).toBe('r');
    expect(statusOfNumber({ ...s, target: undefined, meeting: undefined })).toBe('n');
  });
});

const lines: PaceLineRow[] = [
  { id: LINE, projectId: 'p', key: '2B', name: 'Line 2B', sort: 0 } as PaceLineRow,
  { id: 'line-7', projectId: 'p', key: '7', name: 'Line 7', sort: 1 } as PaceLineRow,
];

describe('a number binding on the tree', () => {
  const node = (o: Partial<TreeNodeRow>): TreeNodeRow =>
    ({ id: 'n', projectId: 'p', text: 'Line 2B holds 60 ppm', rag: 'w', sort: 0, createdAt: 0, updatedAt: 0, ...o });
  const action = (ref: string, line: string): PaceAction =>
    ({ ref, line, action: `Action ${ref}`, status: 'open', category: 'Plant' } as PaceAction);
  const actions = [action('1', 'Line 2'), action('2', 'Line 7')];

  it('draws the box in the colour the number gives it, and leaves the stored colour alone', () => {
    const stored = node({ bind });
    const drawn = withTrackerRows([stored], bindSources(actions, [], lines, src([reading('m-ppm', '2026-09-01', 40)])));
    expect(drawn).toHaveLength(1);
    expect(drawn[0].rag).toBe('r');
    expect(stored.rag).toBe('w');
  });

  it('without the project numbers to hand, the box keeps its stored colour', () => {
    const drawn = withTrackerRows([node({ bind })], bindSources(actions, [], lines));
    expect(drawn[0].rag).toBe('w');
  });

  it('brings NO work under the box — a measure alone is not "every action on the board"', () => {
    const s = bindSources(actions, [], lines, src([]));
    expect(withTrackerRows([node({ bind })], s)).toHaveLength(1);
    expect(bindCount(bind, s)).toEqual({ total: 0, done: 0 });
    expect(unplacedActions([node({ bind })], actions)).toEqual([]);
    expect(bindsWork(bind)).toBe(false);
    expect(bindsNumber(bind)).toBe(true);
  });

  it('can carry both halves at once, and they come apart independently', () => {
    const both: TrackerBind = { line: '2B', categories: ['Plant'], measureId: 'm-ppm', lineId: LINE };
    expect(bindsWork(both)).toBe(true);
    expect(bindsNumber(both)).toBe(true);
    expect(withoutNumber(both)).toEqual({ line: '2B', categories: ['Plant'] });
    expect(withoutWork(both)).toEqual({ measureId: 'm-ppm', lineId: LINE });
    // the last half out leaves no binding at all, not an empty one
    expect(withoutNumber(bind)).toBeUndefined();
    expect(withoutWork({ line: '2B' })).toBeUndefined();
    expect(withoutNumber(undefined)).toBeUndefined();
    // the derived rows still arrive when both halves are set
    const drawn = withTrackerRows([node({ bind: both })], bindSources(actions, [], lines, src([reading('m-ppm', '2026-09-01', 52)])));
    expect(drawn.map(d => d.rag)).toEqual(['g', 'w']);
    expect(drawn[1].id.startsWith('tracker:')).toBe(true);
  });

  it('offers every measure on every line, labelled the way the project says them', () => {
    expect(numberChoices([waste, ppm], lines).map(c => c.label)).toEqual([
      'Packs per minute · Line 2B', 'Packs per minute · Line 7', 'Waste · Line 2B', 'Waste · Line 7',
    ]);
    expect(numberChoices([ppm], [])).toEqual([]);
  });
});

describe('a Next step on the tree', () => {
  const step = (o: Partial<PaceTodoRow>): PaceTodoRow =>
    ({ id: 's', projectId: 'p', what: 'x', who: '', where: '', why: '', when: '', state: 'todo', createdAt: 1, updatedAt: 1, ...o }) as PaceTodoRow;
  it('is red only when its day has gone, amber when it waits on somebody', () => {
    expect(statusOfTodo(step({ state: 'waiting' }), '2026-10-03')).toBe('a');
    expect(statusOfTodo(step({ state: 'todo', due: '2026-10-01' }), '2026-10-03')).toBe('r');
    expect(statusOfTodo(step({ state: 'waiting', due: '2026-10-01' }), '2026-10-03')).toBe('r');
    expect(statusOfTodo(step({ state: 'todo', due: '2026-10-09' }), '2026-10-03')).toBe('w');
    expect(statusOfTodo(step({ state: 'done', due: '2026-10-01' }), '2026-10-03')).toBe('g');
  });
});

