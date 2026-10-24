/* What a 6M problem costs a week and what its countermeasures should be
 * worth — the independent cases of knowledge/specs/FC-146-sixm-money.md §6
 * (worked by hand and in scripts/knowledge/independent-cases.py). */
import { describe, it, expect } from 'vitest';
import { boardWorth, counterWorth, problemMoney } from '../sixmMoney';

const lineA = { crew: 5, labourRatePerHour: 14.8, labourBurden: 1.3, packsPerMin: 60, marginPerPack: 0.06 };
const neck = { names: ['Packer'] };
const hours = (before?: number, now?: number, target?: number) => ({ label: 'Lost time on Line A', unit: 'h a week', better: 'lower' as const, ...(before != null ? { before } : {}), ...(now != null ? { now } : {}), ...(target != null ? { target } : {}) });

describe('what a 6M problem costs a week (FC-146)', () => {
  it('1 — 3 h a week on the whole line: £289 labour, 10,800 packs, £648 contribution', () => {
    const m = problemMoney(hours(3), { whole: true }, lineA, neck);
    expect(m?.beforeMoney?.labour).toBeCloseTo(288.6, 6);
    expect(m?.beforeMoney?.packs).toBe(10800);
    expect(m?.beforeMoney?.contribution).toBeCloseTo(648, 6);
    expect(m?.words).toBe('3 h a week on the line: £289 labour · 10,800 packs lost · £648 contribution a week when it opened.');
  });
  it('2 — before 3 h, now 1.5 h, target 1 h: the saving so far and what the target is worth', () => {
    const m = problemMoney(hours(3, 1.5, 1), { whole: true }, lineA, neck);
    expect(m?.saved?.labour).toBeCloseTo(144.3, 6);
    expect(m?.saved?.contribution).toBeCloseTo(324, 6);
    expect(m?.targetWorth?.contribution).toBeCloseTo(432, 6);
    expect(m?.words).toBe('3 h a week on the line: £289 labour · 10,800 packs lost · £648 contribution a week when it opened; now 1.5 h — £144 labour · 5,400 packs · £324 contribution a week less; the target (1 h) is worth £192 labour · 7,200 packs · £432 contribution a week.');
  });
  it('3 — at a machine that is not the bottleneck: labour only, the line runs round it', () => {
    const m = problemMoney(hours(3), { asset: 'Bagger', whole: false }, lineA, neck);
    expect(m?.beforeMoney?.packs).toBeUndefined();
    expect(m?.words).toBe('3 h a week at Bagger — not the bottleneck, so the line runs round it: £289 labour a week when it opened.');
  });
  it('4 — the bottleneck not known: counted as stopping the line, said so', () => {
    const m = problemMoney(hours(3), { asset: 'Bagger', whole: false }, lineA, undefined);
    expect(m?.beforeMoney?.packs).toBe(10800);
    expect(m?.words.startsWith('3 h a week at Bagger (counted as stopping the line — the bottleneck is not known until the line’s capacity is counted): £289 labour')).toBe(true);
  });
  it('5 — no wage: the wage asked; a wage but no speed: the labour said and the speed asked', () => {
    expect(problemMoney(hours(3), { whole: true }, { crew: 5 }, neck)?.words).toBe('3 h a week on the line — give the line a wage (Set up the line) to say it in money.');
    expect(problemMoney(hours(3), { whole: true }, { crew: 5, labourRatePerHour: 14.8, labourBurden: 1.3 }, neck)?.words).toBe('3 h a week on the line: £289 labour a week when it opened; give the line a speed to say the packs lost.');
  });
  it('6 — a gap problem (a measure in its own unit) or nothing measured: no money, nothing invented', () => {
    expect(problemMoney({ label: 'Rate on Line A', unit: 'ppm', better: 'higher', before: 52, now: 55 }, { whole: true }, lineA, neck)).toBeUndefined();
    expect(problemMoney(hours(), { whole: true }, lineA, neck)).toBeUndefined();
    expect(problemMoney(null, { whole: true }, lineA, neck)).toBeUndefined();
  });
  it('7 — a countermeasure that should remove 40%: £115 labour · 4,320 packs · £259 contribution a week', () => {
    const m = problemMoney(hours(3), { whole: true }, lineA, neck);
    const w = counterWorth(40, m);
    expect(w?.parts.labour).toBeCloseTo(115.44, 6);
    expect(w?.parts.contribution).toBeCloseTo(259.2, 6);
    expect(w?.words).toBe('Should remove 40% of the problem: £115 labour · 4,320 packs · £259 contribution a week.');
    expect(counterWorth(undefined, m)).toBeUndefined();
    expect(counterWorth(40, undefined)).toBeUndefined();
    expect(counterWorth(40, problemMoney(hours(3), { whole: true }, { crew: 5 }, neck))?.words).toBe('Should remove 40% of the problem — give the line a wage to say what that is worth.');
  });
  it('8 — the board: 40% and 30% together; over 100% said', () => {
    const m = problemMoney(hours(3), { whole: true }, lineA, neck);
    const b = boardWorth([40, undefined, 30], m);
    expect(b?.pct).toBe(70); expect(b?.said).toBe(2);
    expect(b?.parts.contribution).toBeCloseTo(453.6, 6);
    expect(b?.words).toBe('The 2 countermeasures that say their shares should remove 70% of the problem: £202 labour · 7,560 packs · £454 contribution a week.');
    expect(boardWorth([80, 40], m)?.words).toMatch(/more than the whole problem/);
    expect(boardWorth([undefined], m)).toBeUndefined();
  });
});
