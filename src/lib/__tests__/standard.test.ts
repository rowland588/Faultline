/* The line standard's arithmetic — headcount, roles, the copy to another
 * product. Counted off the marks, never typed, so it is tested here. */
import { describe, it, expect } from 'vitest';
import { copyFor, headcount, manyOf, MARKS, nextRole, peopleOf, thingsOf, type Standard, type StandardMark } from '../standard';

const m = (o: Partial<StandardMark> & Pick<StandardMark, 'kind'>): StandardMark => ({ id: Math.random().toString(36).slice(2), x: 50, y: 50, ...o });
const map = (marks: StandardMark[]): Standard => ({ id: 's1', projectId: 'p', product: 'Maris Piper 2kg — Tall', marks, sort: 1, createdAt: 1, updatedAt: 1 });

describe('the line standard', () => {
  it('counts the people on the map — headcount is never typed', () => {
    const s = map([m({ kind: 'person', label: 'Op 1' }), m({ kind: 'pallet' }), m({ kind: 'person', label: 'Op 2' })]);
    expect(headcount(s)).toBe(2);
    expect(peopleOf(s).map(p => p.label)).toEqual(['Op 1', 'Op 2']);
  });
  it('gives the next person the lowest free role, so a gap is filled before Op 7', () => {
    expect(nextRole(map([]))).toBe('Op 1');
    expect(nextRole(map([m({ kind: 'person', label: 'Op 1' }), m({ kind: 'person', label: 'Op 3' })]))).toBe('Op 2');
    expect(nextRole(map([m({ kind: 'person', label: 'Line lead' })]))).toBe('Op 1');
  });
  it('says the kit in words', () => {
    expect(thingsOf(map([m({ kind: 'pallet' }), m({ kind: 'pallet' }), m({ kind: 'box' }), m({ kind: 'box' }), m({ kind: 'bin' }), m({ kind: 'person' })])))
      .toBe('2 pallets · 2 boxes · 1 bin');
    expect(thingsOf(map([m({ kind: 'person' })]))).toBe('');
  });
  it('copies to another product with the same places and new ids throughout', () => {
    const s = map([m({ id: 'a', kind: 'person', label: 'Op 1', task: 'Load film', x: 20, y: 30 })]);
    let n = 0;
    const c = copyFor(s, 'Baker 2kg — Tall', () => `n${n++}`, 99, 'prog-9');
    expect(c).toMatchObject({ id: 'n0', product: 'Baker 2kg — Tall', programId: 'prog-9', createdAt: 99 });
    expect(c.marks[0]).toMatchObject({ id: 'n1', label: 'Op 1', task: 'Load film', x: 20, y: 30 });
    expect(s.marks[0].id).toBe('a');
  });
  it('has an icon for every kind, each a drawable path', () => {
    expect(MARKS.length).toBeGreaterThan(35); expect(new Set(MARKS.map(k => k.kind)).size).toBe(MARKS.length);
    for (const k of MARKS) expect(k.glyph).toMatch(/^M[\d.\s,a-zA-Z-]+$/);
  });
});

describe('shapes on the map', () => {
  const shape = (o: Partial<StandardMark>): StandardMark => ({ id: Math.random().toString(36).slice(2), kind: 'shape', shape: 'rect', x: 50, y: 50, w: 20, h: 10, label: 'Bagger', ...o });
  it('are neither people nor kit', () => {
    const s = map([shape({}), shape({ shape: 'circle' }), m({ kind: 'person', label: 'Op 1' }), m({ kind: 'metaldetector' })]);
    expect(headcount(s)).toBe(1);
    expect(thingsOf(s)).toBe('1 metal detector');
  });
  it('copy to another product with the rest of the map', () => {
    let n = 0;
    const c = copyFor(map([shape({ label: 'Hopper' })]), 'Baker 2kg', () => `n${n++}`, 1);
    expect(c.marks[0]).toMatchObject({ kind: 'shape', shape: 'rect', label: 'Hopper', w: 20, h: 10 });
  });
  it('says plurals the way a person would', () => {
    expect(manyOf('Box')).toBe('boxes');
    expect(manyOf('X-ray')).toBe('x-rays');
    expect(manyOf('Tote bin')).toBe('tote bins');
  });
});
