/* What the people placed cost — the seven independent cases of
 * knowledge/specs/FC-006-line-standard-money.md §6 (worked by hand and in
 * scripts/knowledge/independent-cases.py), never the code's own output. */
import { describe, it, expect } from 'vitest';
import { standardMoney, standardMoneySays } from '../standardMoney';
import type { Standard, StandardMark } from '../standard';

const person = (i: number): StandardMark => ({ id: `p${i}`, kind: 'person', x: 10 + i, y: 50, label: `Op ${i}` });
const map = (n: number, capacity?: Standard['capacity']): Pick<Standard, 'marks' | 'capacity'> => ({ marks: Array.from({ length: n }, (_, i) => person(i + 1)), ...(capacity ? { capacity } : {}) });
const line7 = { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, packsPerMin: 100 };
const wrapper = { stations: [{ id: 'w', name: 'Wrapper', kind: 'machine' as const, unit: 'cases', contains: 1, rate: 120, ratePer: 'min' as const }] };

describe('what the people placed cost (FC-006)', () => {
  it('1 — one person on the line’s rated speed: £18.85 an hour, 0.31p a pack', () => {
    const m = standardMoney(map(1), line7);
    expect(m.perHour).toBeCloseTo(18.85, 6);
    expect(m.perPack).toBeCloseTo(18.85 / 6000, 9);
    expect(m.speedFrom).toBe('line');
    expect(standardMoneySays(m)).toBe('1 person placed: £18.85 an hour at the line’s rate — 0.31p a pack at 100 packs a minute (the line’s rated speed).');
  });
  it('2 — twelve people: £226.20 an hour, 3.77p a pack', () => {
    const m = standardMoney(map(12), line7);
    expect(m.perHour).toBeCloseTo(226.2, 6);
    expect(standardMoneySays(m)).toBe('12 people placed: £226.20 an hour at the line’s rate — 3.77p a pack at 100 packs a minute (the line’s rated speed).');
  });
  it('3 — with a Line capacity the speed is its good output in its unit: £75.40 an hour, 1.05p a case at 120 cases a minute', () => {
    const m = standardMoney(map(4, wrapper), line7);
    expect(m.perHour).toBeCloseTo(75.4, 6);
    expect(m.perMin).toBeCloseTo(120, 6);
    expect(m.unit).toBe('cases');
    expect(m.perPack).toBeCloseTo(75.4 / 7200, 9);
    expect(standardMoneySays(m)).toBe('4 people placed: £75.40 an hour at the line’s rate — 1.05p a case at 120 cases a minute (Line capacity).');
  });
  it('4 — Line capacity’s typed people and rate win, and are said as its', () => {
    const m = standardMoney(map(4, { ...wrapper, labour: { people: 6, ratePerHour: 20 } }), line7);
    expect(m.people).toBe(6);
    expect(m.perHour).toBeCloseTo(120, 6);
    expect(standardMoneySays(m)).toBe('6 people as Line capacity has them: £120.00 an hour at Line capacity’s rate — 1.67p a case at 120 cases a minute (Line capacity).');
  });
  it('5 — no wage anywhere: the wage is asked, no figure', () => {
    const m = standardMoney(map(3), { crew: 4, packsPerMin: 100 });
    expect(m.perHour).toBeUndefined();
    expect(m.missing).toEqual(['rate']);
    expect(standardMoneySays(m)).toBe('3 people placed — give the line a wage (Set up the line) to say what they cost an hour and a pack.');
  });
  it('6 — a wage but no speed: the hour said, the speed asked', () => {
    const m = standardMoney(map(2), { labourRatePerHour: 14.5, labourBurden: 1.3 });
    expect(m.perHour).toBeCloseTo(37.7, 6);
    expect(m.perPack).toBeUndefined();
    expect(standardMoneySays(m)).toBe('2 people placed: £37.70 an hour at the line’s rate. Give the line a speed, or map its Line capacity, to say it a pack.');
  });
  it('7 — nobody placed: the ask, and never the line’s crew standing in', () => {
    const m = standardMoney(map(0), line7);
    expect(m.people).toBe(0);
    expect(standardMoneySays(m)).toBe('Place the people on the board to say what they cost.');
  });
  it('a line record missing altogether reads as no wage', () => {
    expect(standardMoney(map(2)).missing).toEqual(['rate']);
  });
});
