import { describe, expect, it } from 'vitest';
import { cycleAnswers, cycleKey, cycleLine, cycleNumbers, cycleView, cyclesOf, nextCycleSeed } from '../methodPdca';

describe('PDCA cycles', () => {
  it('cycle 1 keeps the plain field, later ones @n', () => {
    expect(cycleKey('number', 1)).toBe('number');
    expect(cycleKey('number', 3)).toBe('number@3');
  });
  it('the cycles that exist come from the answers, always at least one', () => {
    expect(cycleNumbers({})).toEqual([1]);
    expect(cycleNumbers({ number: 'x', 'opened@2': 'd', 'change@3': 'y', 'a@1': 'z' })).toEqual([1, 2, 3]);
  });
  it('one cycle’s answers are by plain id', () => {
    expect(cycleAnswers({ number: 'a', 'number@2': 'b', 'change@2': 'c', 'other@2': 'no' }, 2)).toEqual({ number: 'b', change: 'c' });
  });
  it('a cycle’s state is the first quarter not fully written', () => {
    expect(cycleView({}, 1).status).toBe('Not started');
    const plan = { number: 'n', gap: 'g', cause: 'c', change: 'h', expect: 'e' };
    const v = cycleView(plan, 1);
    expect(v.inHand).toBe('Do');
    expect(v.status).toBe('Under way — in Do');
    expect(v.quarters[0]).toMatchObject({ name: 'Plan', written: 5, done: true, word: 'All written' });
  });
  it('a complete cycle says whether the next is planned', () => {
    const all: Record<string, string> = {};
    for (const q of cycleView({}, 1).quarters) for (const f of q.fields) all[f.id] = 'x';
    expect(cycleView(all, 1).status).toBe('Complete — the next cycle is planned');
    delete all.again;
    expect(cycleView(all, 1).status).toBe('Complete — decided');
  });
  it('the next cycle carries the number, the cause, where it ended and Act’s again', () => {
    const a = { number: 'ppm', cause: 'film', result: '57 ppm', again: 'Slower unwind', expect: '58' };
    expect(nextCycleSeed(a, 1, '2026-11-02')).toEqual({ 'number@2': 'ppm', 'gap@2': 'Cycle 1 ended at: 57 ppm', 'cause@2': 'film', 'change@2': 'Slower unwind', 'opened@2': '2026-11-02' });
    expect(nextCycleSeed({ 'number@2': 'q', 'again@2': 'r' }, 2, 'd')).toEqual({ 'number@3': 'q', 'change@3': 'r', 'opened@3': 'd' });
    expect(nextCycleSeed({}, 1, 'd')).toEqual({ 'opened@2': 'd' });
  });
  it('the cycles at a glance, one line each', () => {
    const c = cyclesOf({ number: 'ppm', expect: '58', result: '57', decision: 'Adapt' });
    expect(cycleLine(c[0])).toBe('Cycle 1 — Under way — in Plan. number: ppm; expected 58; result: 57; decision: Adapt.');
  });
});
