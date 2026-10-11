/* The work balance's arithmetic, proved by docs/TOOLKIT.md's worked examples. */
import { describe, it, expect } from 'vitest';
import { element, balance, balanceSays, suggest, cyclesNeeded, elementSays, keptLaps, compareBalances, balanceLine } from '../balance';
import type { BalanceStep } from '../../study';

const laps = (xs: number[]) => xs.map((sec, i) => ({ id: `l${i}`, sec, at: i }));

describe('the time study (tool 3)', () => {
  it('0.42 min at 110 with 14% → 0.527 min standard', () => {
    const e = element({ id: 'e', order: 1, name: 'Wrap and seal', who: 'Op 1', rating: 110, laps: laps([25.2, 25.2, 25.2, 25.2, 25.2]) }, 0.14);
    expect((e.standard ?? 0) / 60).toBeCloseTo(0.527, 3);
    expect(e.basic).toBeCloseTo(27.72, 2);
    expect(e.source).toBe('timed');
  });
  it('mean 0.42, spread 0.04 → 15 cycles for ±5%', () => {
    expect(cyclesNeeded(0.42, 0.04)).toBe(15);
  });
  it('enough only from the cycles needed, never fewer than five', () => {
    const steady = element({ id: 'e', order: 1, name: 'x', who: 'Op 1', laps: laps([10, 10, 10]) });
    expect([steady.needed, steady.enough]).toEqual([5, false]);
    expect(elementSays(steady).text).toBe('10.0 s standard (10.0 s observed at 100) — from 3 cycles, 3 of 5 cycles.');
  });
  it('an interruption and a struck lap count for nothing; a far lap is flagged, never struck', () => {
    const l = [...laps([10, 10.2, 9.8, 10.1, 9.9, 18]), { id: 'f', sec: 40, at: 9, foreign: true }, { id: 's', sec: 1, at: 10, struck: true }];
    expect(keptLaps(l).length).toBe(6);
    const e = element({ id: 'e', order: 1, name: 'x', who: 'Op 1', laps: l });
    expect(e.far).toEqual(['l5']);
    expect(e.n).toBe(6);
  });
  it('a typed time stands until it is timed, and says so', () => {
    const e = element({ id: 'e', order: 1, name: 'x', who: 'Op 1', typedSec: 4 });
    expect([e.source, e.standard]).toEqual(['typed', 4]);
    expect(elementSays(e).text).toBe('4.0 s — typed, not timed.');
  });
});

describe('the Yamazumi (tool 4)', () => {
  /* 54 s of work, five people, a 12 s takt: 12, 11, 11, 10, 10. */
  const steps: BalanceStep[] = [['Op 1', 12], ['Op 2', 11], ['Op 3', 11], ['Op 4', 10], ['Op 5', 10]]
    .map(([who, t], i) => ({ id: `s${i}`, order: i, name: `Element ${i + 1}`, who: who as string, typedSec: t as number }));
  it('54 s at a 12 s takt → 5 people, 90% balanced, Op 1 the constraint', () => {
    const f = balance(steps, { taktSec: 12 });
    expect([f.total, f.fewest, f.people.length]).toEqual([54, 5, 5]);
    expect(f.efficiency).toBeCloseTo(0.9, 6);
    expect(f.constraint?.who).toBe('Op 1');
    const s = balanceSays(f);
    expect(s.text).toBe('54.0 s of work at a 12.0 s takt — 5 people needed, 5 working, 90% balanced. Op 1 carries 12.0 s — the constraint. Op 4 has 2.0 s to spare.');
  });
  it('over takt is said first, in red, with how much', () => {
    const f = balance([...steps, { id: 'x', order: 9, name: 'Extra', who: 'Op 3', typedSec: 2.4 }], { taktSec: 12 });
    const s = balanceSays(f, 6);
    expect(s.tone).toBe('r');
    expect(s.lines[0]).toEqual({ text: 'Op 3 carries 13.4 s — over takt by 1.4 s.', tone: 'r' });
    expect(s.lines[1]).toEqual({ text: 'The map has 6 people; the work needs 5.', tone: 'a' });
  });
  it('a stack is only as known as the weakest element on it', () => {
    const f = balance([{ id: 'a', order: 0, name: 'a', who: 'Op 1', laps: laps([5, 5, 5, 5, 5]) }, { id: 'b', order: 1, name: 'b', who: 'Op 1', typedSec: 3 }], { taktSec: 12 });
    expect(f.people[0].source).toBe('typed');
  });
  it('an element with no time is not zero: no headcount, balance or constraint until every element has one', () => {
    const f = balance([...steps.slice(0, 2), { id: 'u', order: 7, name: 'Untimed', who: 'Op 3' }, { id: 'v', order: 8, name: 'Also', who: 'Op 4' }], { taktSec: 12 });
    expect([f.fewest, f.efficiency, f.constraint, f.untimed]).toEqual([undefined, undefined, undefined, 2]);
    const s = balanceSays(f, 4);
    expect(s.text).toBe('2 of 4 elements have a time — 23.0 s of work so far at a 12.0 s takt. Time the rest to read the balance.');
    expect([s.tone, s.lines]).toEqual(['n', []]);
    const over = balanceSays(balance([{ id: 'a', order: 0, name: 'a', who: 'Op 1', typedSec: 13 }, { id: 'b', order: 1, name: 'b', who: 'Op 2' }], { taktSec: 12 }));
    expect([over.tone, over.lines[0].text]).toEqual(['r', 'Op 1 carries 13.0 s — over takt by 1.0 s.']);
  });
  it('no takt, nothing to balance against; no elements, nothing to time', () => {
    expect(balanceSays(balance(steps, undefined)).text).toMatch(/^Agree the takt/);
    expect(balanceSays(balance([], { taktSec: 12 })).text).toMatch(/^List the work/);
  });
  it('the suggestion fills the fewest people in order, never past takt until the last', () => {
    const f = balance([4, 5, 3, 6, 2, 7, 5].map((t, i) => ({ id: `e${i}`, order: i, name: `E${i}`, who: 'Op 1', typedSec: t })), { taktSec: 12 });
    expect(f.fewest).toBe(3);
    const g = suggest(f);
    expect(g?.map(x => x.work)).toEqual([12, 8, 12]);
    expect(g?.map(x => x.who)).toEqual(['Op 1', 'Op 2', 'Op 3']);
  });
});

describe('before → after on a balance', () => {
  const at = (ts: number[]) => ts.map((t, i) => ({ id: `e${i}`, order: i, name: `E${i}`, who: `Op ${i + 1}`, typedSec: t }));
  it('over takt before, within after: said with both numbers and who', () => {
    const c = compareBalances(balance(at([12.9, 8, 6]), { taktSec: 12 }), balance(at([11.6, 9, 7]), { taktSec: 12 }));
    expect(c.text).toBe("The longest stack 12.9 s → 11.6 s against a 12.0 s takt · 70% → 79% balanced — within takt now. The number moved; what moved it is the fix's to say.");
    expect(c.tone).toBe('g');
  });
  it('the constraint moved to someone else: both named; still over is red', () => {
    const c = compareBalances(balance(at([12.9, 8]), { taktSec: 12 }), balance(at([10, 12.4]), { taktSec: 12 }));
    expect(c.text).toMatch(/^The longest stack 12\.9 s \(Op 1\) → 12\.4 s \(Op 2\) against a 12\.0 s takt .* — still over by 0\.4 s\./);
    expect(c.tone).toBe('r');
  });
  it('an untimed element on either side: too early', () => {
    const c = compareBalances(balance([...at([12.9]), { id: 'x', order: 5, name: 'x', who: 'Op 2' }], { taktSec: 12 }), balance(at([11]), { taktSec: 12 }));
    expect(c.tone).toBe('n');
  });
  it('the line for paper leads with whoever is over', () => {
    const l = balanceLine(balance(at([12.9, 8, 6]), { taktSec: 12 }));
    expect(l.verdict).toBe('Over takt');
    expect(l.text).toBe('Op 1 carries 12.9 s — over takt by 0.9 s. 26.9 s of work at a 12.0 s takt — 3 people needed, 3 working.');
  });
});
