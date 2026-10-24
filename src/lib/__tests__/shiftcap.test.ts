/* CAPACITY A SHIFT — docs/CAPACITY.md §2: the time a shift less its planned
 * stops (the breaks the line stops for, SMED's changeovers), at the
 * bottleneck's speed. Worked by hand: a shift of 8 h less 30 min of breaks is
 * 450 min; 3 changeovers of 42 min take 126; 324 min making × 100 bags a
 * minute = 32,400 bags — 45,000 if it never changed over. */
import { describe, it, expect } from 'vitest';
import { analyse, labourCost, lineSpeed, shiftCapacity, shiftsIn, type Station } from '../capacity';
import { changeoverIn } from '../../tools/changeover/changeover';
import { idealOf } from '../../tools/losses/losses';
import type { ToolStudy } from '../study';

const st = (p: Partial<Station>): Station => ({ id: 's', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 100, ratePer: 'min', source: 'plate', ...p });
const r = analyse({ stations: [st({ id: 'w', name: 'Weigher', rate: 140 }), st({ id: 'b' }), st({ id: 'p', name: 'Packers', kind: 'people', rate: 120, source: 'standard' })] });
const days = { name: 'Days', min: 480, breakMin: 30 }, lates = { name: 'Lates', min: 480, breakMin: 30 };

describe('capacity a shift', () => {
  it('the shift less its breaks, less SMED’s changeovers, at the bottleneck — and what the changeovers cost', () => {
    const c = shiftCapacity(r, [days, lates], { min: 42, perShift: 3, agreed: true, from: 'Finest Red 2kg' })!;
    expect(c.rows[0]).toEqual({ name: 'Days', min: 480, breakMin: 30, planned: 450, changeoverMin: 126, making: 324, made: 32_400, without: 45_000 });
    expect(c.day).toEqual({ made: 64_800, without: 90_000, changeoverMin: 252 });
    expect(c.short).toBe('32,400 bags a shift — 126 of 450 min changing over');
    expect(c.sentence).toBe('A shift of 8 h, less 30 min of breaks the line stops for, is 450 min; 3 changeovers of 42 min (the standard from Finest Red 2kg) take 126 min — 324 min making. At Bagger’s 100 bags a minute that is 32,400 bags a shift — 45,000 if it never changed over; 2 shifts a day, 64,800.');
  });
  it('shifts that differ are each said, and the day summed', () => {
    const c = shiftCapacity(r, [days, { name: 'Nights', min: 360, breakMin: 0 }], { min: 42, perShift: 1, agreed: false })!;
    expect(c.rows.map(x => x.made)).toEqual([40_800, 31_800]);
    expect(c.sentence).toBe('At Bagger’s 100 bags a minute: Days 40,800 · Nights 31,800 — 72,600 bags a day; 1 changeover a shift of 42 min (as timed on the SMED, not yet the standard) takes 84 min a day — 81,000 if it never changed over.');
    /* a shift whose breaks are not said: no day, and the changeovers still said whole */
    expect(shiftCapacity(r, [days, { name: 'Nights', min: 480 }], { min: 42, perShift: 3, agreed: true })!.sentence)
      .toMatch(/^At Bagger’s 100 bags a minute: Days 32,400 bags; 3 changeovers a shift of 42 min \(the standard\) come off each\. Nights: /);
  });
  it('nothing assumed: a changeover not timed, or not counted, comes off nothing and is said so; a break not said leaves its shift out', () => {
    expect(shiftCapacity(r, [days])!.sentence).toBe('A shift of 8 h, less 30 min of breaks the line stops for, is 450 min. At Bagger’s 100 bags a minute that is 45,000 bags a shift. No changeover is timed into this product yet — SMED times one; until then none comes off.');
    expect(shiftCapacity(r, [days], { min: 42, agreed: false })!.sentence).toMatch(/A changeover is 42 min \(as timed on the SMED, not yet the standard\), but how many a shift is not said on the SMED — none comes off until it is\.$/);
    const c = shiftCapacity(r, [days, { name: 'Nights', min: 480 }], { min: 42, perShift: 3, agreed: true })!;
    expect([c.rows[1].planned, c.day]).toEqual([undefined, undefined]);
    expect(c.sentence).toMatch(/Nights: the breaks are not said on the line’s settings, so no capacity is worked out for it\.$/);
    expect(shiftCapacity(r, [])!.sentence).toMatch(/^The line’s shifts are not set/);
    expect(shiftCapacity(analyse({ stations: [] }), [days])).toBeUndefined();
  });
  it('reads the line’s own shifts: their clock times, overnight too; relief is 0; a break not set is not said', () => {
    expect(shiftsIn([{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Nights', start: '22:00', end: '06:00', breakMin: 45, relief: true },
      { name: '', start: '14:00', end: '22:00' }, { name: 'Spare', start: '', end: '' }]))
      .toEqual([{ name: 'Days', min: 480, breakMin: 30 }, { name: 'Nights', min: 480, breakMin: 0 }, { name: 'Shift 3', min: 480 }]);
  });
  it('the changeover taken off: the standard’s newest agreed minutes, counted by the SMED it came from; else the SMED as timed', () => {
    const study = (id: string, at: number, mins: number, count?: { count: number; per: 'shift' | 'day' | 'week' }): ToolStudy => ({
      id, tool: 'changeover', name: id, standardId: 'std', startedAt: at, createdAt: at, updatedAt: at, uses: [],
      facts: { sequence: [{ id: id + 'e', name: 'Change the formers', order: 0, side: 'internal', sec: mins * 60, source: 'timed' }],
        running: { shiftsPerDay: 2, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5 }, ...(count ? { changeovers: count } : {}) } });
    const a = study('a', 1, 50, { count: 3, per: 'shift' }), b = study('b', 2, 40, { count: 10, per: 'week' });
    const agreed = [{ id: 'x', from: 'Finest Red 2kg', steps: [], minutes: 42, agreedAt: 5, fromStudyId: 'a' }, { id: 'y', steps: [], minutes: 60, agreedAt: 1, fromStudyId: 'b' }];
    expect(changeoverIn(agreed, [a, b], 'std')).toEqual({ min: 42, perShift: 3, agreed: true, from: 'Finest Red 2kg' });
    /* none agreed: the newest SMED as timed — 10 a week over 5 days of 2 shifts is 1 a shift */
    expect(changeoverIn(undefined, [a, b], 'std')).toEqual({ min: 40, perShift: 1, agreed: false });
    expect(changeoverIn(undefined, [{ ...b, facts: { ...b.facts, changeovers: undefined } }], 'std')).toEqual({ min: 40, agreed: false });
    expect(changeoverIn(undefined, [a], 'other')).toBeUndefined();
  });
});

/* REJECTS ON THE LINE — the audit of 13 October. Worked by hand:
 *   the Weigher passes 98% on: the Bagger at 100 is 100 ÷ 0.98 = 102.04 at
 *   the start of the line — right for finding the bottleneck like for like,
 *   wrong as what it makes: it bags 100 a minute, never 102.
 *   324 min making × 100 = 32,400 bags a shift, as with no rejects.
 *   And the Packers keeping 95% on: 100 × 0.95 = 95 good off the end —
 *   324 × 95 = 30,780 good a shift; 450 × 95 = 42,750 if it never changed over. */
describe('capacity a shift, with rejects on the line', () => {
  const co = { min: 42, perShift: 3, agreed: true, from: 'Finest Red 2kg' };
  it('a station rejecting before the bottleneck adds nothing to what it makes', () => {
    const rj = analyse({ stations: [st({ id: 'w', name: 'Weigher', rate: 140, goodPct: 98 }), st({ id: 'b' }), st({ id: 'p', name: 'Packers', kind: 'people', rate: 120, source: 'standard' })] });
    expect(rj.line).toBeCloseTo(100 / 0.98, 9);               // the like-for-like figure the bottleneck is found on
    const c = shiftCapacity(rj, [days], co)!;
    expect(c.rows[0].made).toBeCloseTo(32_400, 6);
    expect(c.rows[0].without).toBeCloseTo(45_000, 6);
    expect(c.sentence).toMatch(/\. At Bagger’s 100 bags a minute that is 32,400 bags a shift — 45,000 if it never changed over\.$/);
  });
  it('rejects at or after the bottleneck: what it makes is the good off the end, said so', () => {
    const rj = analyse({ stations: [st({ id: 'w', name: 'Weigher', rate: 140 }), st({ id: 'b' }), st({ id: 'p', name: 'Packers', kind: 'people', rate: 120, source: 'standard', goodPct: 95 })] });
    const c = shiftCapacity(rj, [days], co)!;
    expect([c.rows[0].made, c.rows[0].without].map(x => Math.round((x ?? 0) * 1e6) / 1e6)).toEqual([30_780, 42_750]);
    expect(c.sentence).toMatch(/\. At Bagger’s 100 bags a minute \(95 good off the end of the line\) that is 30,780 bags a shift — 42,750 if it never changed over\.$/);
    expect(c.short).toBe('30,780 bags a shift — 126 of 450 min changing over');
  });
  it('the line’s speed — what SMED and the loss count count a stop at — is the bottleneck’s own: 100, not 102', () => {
    const cap = { stations: [st({ id: 'w', name: 'Weigher', rate: 140, goodPct: 98 }), st({ id: 'b' }), st({ id: 'p', name: 'Packers', kind: 'people', rate: 120, source: 'standard' })] };
    expect(lineSpeed(cap)).toEqual({ perMin: 100, unit: 'bags', station: 'Bagger', from: 'plate' });
    expect(idealOf(cap)).toMatchObject({ rate: 100, how: 'plate' });
    /* in the line's unit at its place: 8 cases a minute of 12 bags, two case packers, is 192 bags — whatever is rejected before them */
    const cased = { stations: [st({ id: 'b', rate: 250, goodPct: 96 }), st({ id: 'k', name: 'Case packer', unit: 'cases', contains: 12, rate: 8, crew: 2 })] };
    expect(lineSpeed(cased)?.perMin).toBe(192);
    /* what a pack costs in labour is over the good off the end: 6 people at £12 over 100 bags a minute is 1.2p */
    expect(labourCost(analyse(cap), 6, 12)?.perPack).toBeCloseTo(72 / 6000, 12);
  });
  it('the bottleneck’s own stops count: 100 at 90% running is 90 a minute, 29,160 a shift', () => {
    const rj = analyse({ stations: [st({ id: 'w', name: 'Weigher', rate: 140 }), st({ id: 'b', runningPct: 90 })] });
    expect(shiftCapacity(rj, [days], co)!.rows[0].made).toBeCloseTo(324 * 90, 6);
    /* a shift all breaks: nothing to make, and nothing below nought */
    const all = shiftCapacity(rj, [{ name: 'Short', min: 30, breakMin: 45 }], co)!;
    expect([all.rows[0].planned, all.rows[0].changeoverMin, all.rows[0].making, all.rows[0].made]).toEqual([0, 0, 0, 0]);
  });
});
