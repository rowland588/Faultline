/* The spaghetti board (FC-004 part 3, knowledge/specs/FC-004-spaghetti-board.md §6) against the independent cases of
 * scripts/knowledge/cases-kaizen.py S4: (a) the scale and a straight line; (b) S3's three operators placed on a board reproduce
 * S3's own figures to the calculator's literals; (c) a measured metres typed over a move wins and is kept. */
import { describe, expect, it } from 'vitest';
import { addToWalk, boardInputs, emptyBoard, metresPerUnit, namesOf, pathsOf, readBoard, straightMetres, undoWalk, withoutMark, writeBoard, canAdd, eastNorth, fromStandardMarks, type SpagBoard } from '../board';
import { runCalc } from '../../calc/calc';
import def from '../../calc/defs/spaghetti-walkers';
import type { Inputs } from '../../calc/types';

const apply = (cur: Inputs, patch: Record<string, string | number | null>): Inputs => {
  const out: Inputs = { ...cur };
  for (const [k, v] of Object.entries(patch)) { if (v === null) delete out[k]; else out[k] = v; }
  return out;
};

describe('the scale (case a)', () => {
  it('two taps half the width apart called 16 m make the wide board 32 m across; a move of 4 units each way is 11.3 m', () => {
    const b: SpagBoard = { ...emptyBoard('wide'), scale: { a: [25, 50], b: [75, 50], m: 16 } };
    expect(metresPerUnit(b)).toBe(2);
    expect(straightMetres(b, [25, 25], [50, 25 + 400 / 9])).toBeCloseTo(11.3137, 4);
    expect(metresPerUnit(emptyBoard())).toBeUndefined();
  });
  it('east and north are from the bottom-left corner', () => {
    const b: SpagBoard = { ...emptyBoard('wide'), scale: { a: [0, 50], b: [100, 50], m: 64 } };
    expect(eastNorth(b, [0, 100])).toEqual({ x: 0, y: 0 });
    expect(eastNorth(b, [100, 0])).toEqual({ x: 64, y: 36 });
  });
});

/** S3 on a board: the scale 64 m across (4 m a unit, 36 m up), the line an area centred at 75 % across and 80 % down, the three operators in it,
 *  the film store 40 m to its left, the case store 25 m above it, the scale icon 9 m to its right. */
const s3 = (): SpagBoard => {
  let b: SpagBoard = {
    shape: 'wide', scale: { a: [0, 50], b: [100, 50], m: 64 }, walks: [],
    marks: [
      { id: 'line', kind: 'area', x: 75, y: 80, w: 10, h: 10, label: 'Packing line' },
      { id: 'p1', kind: 'person', x: 74, y: 80 }, { id: 'p2', kind: 'person', x: 76, y: 80 }, { id: 'p3', kind: 'person', x: 75, y: 82 },
      { id: 'film', kind: 'place', x: 12.5, y: 80, label: 'Film store' },
      { id: 'case', kind: 'place', x: 75, y: (100 * 3.8) / 36, label: 'Case store' },
      { id: 'sc', kind: 'scale', x: 89.0625, y: 80 },
    ],
  };
  for (const p of ['film', 'line', 'case', 'line']) b = addToWalk(b, 'p1', p);
  for (const p of ['sc', 'line', 'film', 'line']) b = addToWalk(b, 'p2', p);
  for (const p of ['case', 'line']) b = addToWalk(b, 'p3', p);
  return b;
};

describe('S3 drawn on a board (case b)', () => {
  it('names the unnamed: the people Operator 1–3, the scale icon Scale', () => {
    const n = namesOf(s3());
    expect([n.get('p1'), n.get('p2'), n.get('p3'), n.get('sc')]).toEqual(['Operator 1', 'Operator 2', 'Operator 3', 'Scale']);
  });
  it('a walk starts at the area the person stands in', () => {
    const p = pathsOf(s3());
    expect(p.map(x => x.points.map(pt => pt.name))).toEqual([
      ['Packing line', 'Film store', 'Packing line', 'Case store', 'Packing line'],
      ['Packing line', 'Scale', 'Packing line', 'Film store', 'Packing line'],
      ['Packing line', 'Case store', 'Packing line'],
    ]);
  });
  it('fills the boxes so the calculator says S3’s own figures', () => {
    const inputs = apply({ rounds: 10, pace: 'loaded', rate: 25, shiftsWeek: 5, board: writeBoard(s3()) }, boardInputs(s3(), {}));
    expect(inputs.l01_name).toBe('Packing line');
    const r = runCalc(def, inputs).result;
    expect(r?.sentence).toBe('3 walkers make 10 moves a round, 278 m together. Operator 1 walks most — 130 m (47%). Packing line is arrived at most — 5 times.');
    expect(r?.verdict).toBe('2.8 km a shift');
    expect(r?.money?.text).toBe('35.6 min of walking a shift at £25.00 an hour is £14.85 a shift — £74.25 over 5 shifts a week.');
    expect(r?.picture?.title).toBe('The walk on the board, to scale');
    expect(r?.picture?.areas?.[0]).toMatchObject({ label: 'Packing line' });
    expect(r?.picture?.areas?.[0].x0).toBeCloseTo(44.8, 6);
  });
});

describe('a measured metres typed over (case c)', () => {
  it('wins over the straight line, and is kept when the board writes again', () => {
    let inputs = apply({ board: writeBoard(s3()) }, boardInputs(s3(), {}));
    inputs = { ...inputs, w1_s02_m: 46 };
    const again = apply(inputs, boardInputs(s3(), inputs));
    expect(again.w1_s02_m).toBe(46);
    expect(runCalc(def, again).result?.sentence).toContain('284 m together');
    /* the move it sat on changed: the measured metres no longer belong to it, and go */
    const moved = addToWalk(undoWalk(undoWalk(undoWalk(undoWalk(s3(), 'p1'), 'p1'), 'p1'), 'p1'), 'p1', 'case');
    expect(apply(again, boardInputs(moved, again)).w1_s02_m).toBeUndefined();
  });
});

describe('no scale, and the edges', () => {
  it('without a scale the moves are counted and the layout is emptied', () => {
    const b = { ...s3(), scale: undefined };
    const inputs = apply({ board: writeBoard(b), l01_name: 'old', l01_x: 1, l01_y: 1 }, boardInputs(b, {}));
    expect(inputs.l01_name).toBeUndefined();
    const run = runCalc(def, inputs);
    expect(run.result?.sentence).toBe('3 walkers make 10 moves a round; no lengths were given, so moves are counted, not metres. Operator 1 makes the most — 4 of 10 (40%). Packing line is arrived at most — 5 times.');
    expect(run.problems.map(p => p.say).join(' ')).toContain('no scale is set');
    expect(run.result?.picture?.schematic).toBe(true);
  });
  it('a person standing in no area starts at their own spot; a place tapped twice in a row is one visit', () => {
    let b: SpagBoard = { ...emptyBoard(), marks: [{ id: 'p', kind: 'person', x: 10, y: 10, label: 'FLT driver' }, { id: 'a', kind: 'place', x: 50, y: 50 }] };
    b = addToWalk(addToWalk(b, 'p', 'a'), 'p', 'a');
    expect(pathsOf(b)[0].points.map(x => x.name)).toEqual(['FLT driver’s spot', 'Place 1']);
  });
  it('a fifth walker is refused in words; a mark taken off takes its walk with it', () => {
    let b: SpagBoard = { ...emptyBoard(), marks: [1, 2, 3, 4, 5].map(i => ({ id: `p${i}`, kind: 'person', x: i * 10, y: 10 })).concat([{ id: 'a', kind: 'place', x: 50, y: 50 }]) };
    for (const i of [1, 2, 3, 4]) b = addToWalk(b, `p${i}`, 'a');
    expect(canAdd(b, 'p5')).toMatch(/Four people are walking already/);
    expect(canAdd(b, 'p1')).toBeUndefined();
    expect(withoutMark(b, 'p1').walks).toHaveLength(3);
    expect(withoutMark(b, 'a').walks).toHaveLength(0);
  });
  it('reads back what it wrote, and nothing else as a board', () => {
    expect(readBoard(writeBoard(s3()))?.walks).toHaveLength(3);
    expect(readBoard('not a board')).toBeUndefined();
    expect(readBoard(undefined)).toBeUndefined();
  });
  it('a Line standard’s marks: people, rectangles as areas, icons; circles and words left off', () => {
    const r = fromStandardMarks([
      { id: '1', kind: 'person', x: 1, y: 1, label: 'Op 1' }, { id: '2', kind: 'shape', shape: 'rect', x: 5, y: 5, w: 20, h: 10, label: 'Wrapper\nlong words' },
      { id: '3', kind: 'shape', shape: 'circle', x: 5, y: 5 }, { id: '4', kind: 'pallet', x: 9, y: 9 }, { id: '5', kind: 'shape', shape: 'text', x: 1, y: 1 },
    ]);
    expect(r.marks.map(m => [m.kind, m.label])).toEqual([['person', 'Op 1'], ['area', 'Wrapper'], ['pallet', undefined]]);
    expect(r.left).toBe(2);
  });
});
