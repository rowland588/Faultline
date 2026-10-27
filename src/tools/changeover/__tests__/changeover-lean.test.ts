/* SMED AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 6) — lib/ie/changeoverLean,
 * on lib/ie/changeover's WORKED EXAMPLE 2 (changeover.test.ts): 42 min now,
 * 33 separated (9 min external), 27 converted, 9 streamlined; 2 shifts of
 * 7.5 h running, 7 days, 48 weeks, 3 changeovers a shift, 100 a minute, idle
 * labour £200 an hour, £0.05 a pack contribution:
 *   a year   42 × 42 × 48 = 84,672 min = 1,411.2 h · 8,467,200 packs · £282,240 · £423,360
 *   back     42 × (42 − 9) = 1,386 min = 23.1 h a week · 138,600 packs ·
 *            23.1 × £200 = £4,620 · 138,600 × £0.05 = £6,930 */
import { describe, expect, it } from 'vitest';
import { changeoverSays, extrapolationSays, figuresOf, ladderOf } from '../changeover';
import { smedLean } from '../changeoverLean';
import type { ChangeoverStep, ToolStudy } from '../../../lib/study';

const M = 60;
const planned = (): ChangeoverStep[] => [
  { id: 'A', order: 0, name: 'Change the former tube', sec: 10 * M, side: 'internal', source: 'timed', crew: ['Op 1'], plan: { kind: 'streamline', how: 'clamps', targetSec: 4 * M } },
  { id: 'E', order: 1, name: 'Fetch the next former', sec: 9 * M, side: 'external', source: 'timed', crew: ['Op 1'] },
  { id: 'B', order: 2, name: 'Heat the new sealing jaws', sec: 6 * M, side: 'internal', source: 'timed', crew: ['Op 1'], plan: { kind: 'convert', how: 'prepare' } },
  { id: 'C', order: 3, name: 'Change the film reel', sec: 8 * M, side: 'internal', source: 'timed', crew: ['Op 1'], plan: { kind: 'streamline', how: 'parallel', alongside: 'A', crew: ['Fitter'], targetSec: 5 * M } },
  { id: 'D', order: 4, name: 'Adjust the jaw pressure', sec: 5 * M, side: 'internal', source: 'timed', crew: ['Op 1'], plan: { kind: 'eliminate', how: 'no-adjust' } },
  { id: 'F', order: 5, name: 'First bags and check the seal', sec: 4 * M, side: 'internal', source: 'timed', crew: ['Op 1', 'Team leader'] },
];
const study = (facts: ToolStudy['facts']): ToolStudy => ({ id: 's', tool: 'changeover', name: 'Finest Red 2kg → Express 1.25 kg', facts, uses: [], startedAt: Date.parse('2026-10-15T10:00:00Z'), createdAt: 0, updatedAt: 0 } as ToolStudy);
const read = (s: ToolStudy, money?: { labourPerHour: number; marginPerPack: number }) => {
  const f = figuresOf(s.facts), l = ladderOf(s.facts.sequence);
  return smedLean({ s, f, l, said: changeoverSays(f), cost: extrapolationSays(l, s.facts, money), ...(money ? { money } : {}), line: 'Line 7' });
};
const full = study({ sequence: planned(), running: { shiftsPerDay: 2, hoursPerShift: 8, breakMin: 30, daysPerWeek: 7, weeksPerYear: 48 }, changeovers: { count: 3, per: 'shift' },
  ratePerMin: 100, rateFrom: 'plate', rateStation: 'Bagger', fromProduct: 'Finest Red 2kg', toProduct: 'Express 1.25 kg' });

describe('SMED’s tiles, plan and closing line', () => {
  it('now, inside the stop, planned to, a year stopped in packs and pounds, what the plan buys back', () => {
    const p = read(full, { labourPerHour: 200, marginPerPack: 0.05 });
    expect(p.tiles.map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Now', '42 min', '6 elements, timed', undefined],
      ['Inside the stop', '33 min', 'once the 9 min of external work is done while the line runs', 'a'],
      ['Planned to', '9 min', '27 min converted · 9 min streamlined — single digits', 'g'],
      ['A year stopped', '1,411.2 h', '8,467,200 packs · £282,240 labour · £423,360 contribution', undefined],
      ['The plan buys back', '23.1 h', 'a week — 138,600 packs · £4,620 labour · £6,930 contribution, if the plan holds', undefined],
    ]);
    expect(p.closing).toEqual({ text: '42 min now — 32 min from single digits; the changeovers stop the line 29.4 h a week — £5,880 of idle labour, and £8,820 of contribution if the packs cannot be made up; the plan buys back 23.1 h a week.', tone: 'a' });
    expect([p.sub, p.verdict, p.facts]).toEqual(['From Finest Red 2kg to Express 1.25 kg', { text: '9 min external inside', tone: 'a' }, [['Line', 'Line 7'], ['Started', '15 Oct'], ['The plan', 'streamlined to 9 min']]]);
    expect(p.actions.map(a => [a.what, a.who, a.state])).toEqual([
      ['Change the former tube — streamline (quick-release clamps), 10 min → 4 min', 'Op 1', 'Planned'],
      ['Heat the new sealing jaws — convert to external (prepare in advance), 6 min', 'Op 1', 'Planned'],
      ['Change the film reel — streamline (in parallel), 8 min → 5 min', 'Fitter', 'Planned'],
      ['Adjust the jaw pressure — eliminate (no adjustment), 5 min', 'Op 1', 'Planned'],
    ]);
  });
  it('how the line runs not said: what to say, never a figure; no cost settings: the pounds asked for', () => {
    const p = read(study({ sequence: planned() }));
    expect(p.tiles.slice(3).map(t => [t.k, t.v, t.of])).toEqual([
      ['A week stopped', '—', 'say the shifts a day, the hours a shift, the days a week, how many changeovers a shift, a day or a week'],
      ['Buys back', '—', 'said once what they cost is'],
    ]);
    expect(p.closing.text).toBe('42 min now — 32 min from single digits; what they cost needs how the line runs.');
    const noMoney = read(full);
    expect(noMoney.tiles[3].of).toBe('8,467,200 packs · give the line its crew, rate and margin on the Factory’s Lines page for the pounds');
  });
  it('nothing timed: the sentence that says what to do, and no figures', () => {
    const p = read(study({ sequence: [] }));
    expect(p.tiles.map(t => t.v)).toEqual(['—', '—', '—', '—', '—']);
    expect(p.closing.tone).toBe('n');
    expect(p.actions).toEqual([]);
  });
});
