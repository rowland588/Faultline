/* FC-039 recovery levers — the plan the levers chosen buy, on the case scripts/knowledge/cases-toc.py works by plain arithmetic:
 *   a counted shift: the constraint (the Bagger) at 120 a minute; breakdown ON it 40 min, jams on the Filler (off it) 30 min,
 *   changeover 36 min; a pack earns 35p; the crew costs £1 a minute standing. Two such shifts make the period.
 *   20% of the breakdown = 8 min back = 960 packs = £336; 50% of the changeover = 18 min = 2,160 packs = £756;
 *   together 26 min = 3,120 packs = £1,092 a shift; ten shifts a week: £10,920, 31,200 packs, 4.33 hours.
 *   jams off the constraint at 100%: 30 min back, no packs, no contribution, £30 of idle labour. */
import { describe, expect, it } from 'vitest';
import { leversOf, leverPlan, periodWaterfall } from '../intelligence';
import type { LossFigures } from '../../tools/losses/losses';

const bar = (b: Record<string, unknown>) => ({ bone: 'Machine', grade: 'measured', ...b });
const shift = (): LossFigures => ({ enough: true, missing: [], plannedMin: 450, rate: 120, made: 40_080, rejects: 0, split: true, logged: 0, stopsN: 0, stopsMin: 0, byCause: [], changeoverMin: 0, changeoverN: 0,
  bars: [
    bar({ key: 'cause:Breakdown', kind: 'cause', label: 'Breakdown', min: 40, asset: 'Bagger', contribution: 40 * 120 * 0.35, labour: 40 }),
    bar({ key: 'cause:Jams', kind: 'cause', label: 'Jams', min: 30, asset: 'Filler', contribution: 30 * 120 * 0.35, labour: 30 }),
    bar({ key: 'changeover', kind: 'changeover', label: 'Changeovers', min: 36, contribution: 36 * 120 * 0.35, labour: 36 }),
  ] } as unknown as LossFigures);
const fall = periodWaterfall([{ id: 'a', figures: shift() }, { id: 'b', figures: shift() }], { name: 'Bagger', products: ['A'], others: [] });
const plan = (pct: Record<string, number>, spw: number | null = 10) => leverPlan(fall, leversOf(fall, 120, pct, spw ?? undefined, 'packs'), { unit: 'packs' });
const r2 = (n?: number) => Math.round((n ?? 0) * 100) / 100;

describe('the plan a few levers buy', () => {
  const p = plan({ 'cause:Breakdown': 20, changeover: 50 });
  it('each lever: minutes back, packs at the constraint, the two money parts', () => {
    const b = p.rows.find(r => r.label === 'Breakdown');
    expect([r2(b?.backMin), Math.round(b?.packs ?? 0), r2(b?.contribution), r2(b?.labour)]).toEqual([8, 960, 336, 8]);
    const c = p.rows.find(r => r.label === 'Changeovers');
    expect([r2(c?.backMin), Math.round(c?.packs ?? 0), r2(c?.contribution), r2(c?.labour)]).toEqual([18, 2160, 756, 18]);
  });
  it('together a shift, and a week of ten shifts', () => {
    expect([r2(p.total.backMin), Math.round(p.total.packs), r2(p.total.contribution), r2(p.total.labour)]).toEqual([26, 3120, 1092, 26]);
    expect([r2(p.week?.hours), Math.round(p.week?.packs ?? 0), r2(p.week?.contribution), r2(p.week?.labour)]).toEqual([4.33, 31_200, 10_920, 260]);
    expect(p.shiftsPerWeek).toBe(10);
  });
  it('the sentence says the share, the shift and the week, the two parts apart', () => {
    expect(p.sentence).toBe('20% off breakdown on the Bagger, 50% off changeovers: 26 min a shift back — 3,120 more packs a shift · £1,092 of lost contribution · £26 of idle labour; a week of 10 shifts, 4.3 hours back — 31,200 more packs a week · £10,920 of lost contribution · £260 of idle labour (changeovers: only if on the constraint).');
  });
  it('the lever with the most to give at the constraint is named whatever share is chosen', () => {
    expect(p.prize).toEqual({ label: 'Breakdown', asset: 'Bagger', perShift: 40 });
  });
  it('the paper’s lines read from the same rows', () => {
    expect(p.lines[0]).toBe('Breakdown · Bagger (constraint) — 20% of 40 min a shift = 8 min back (1.3 h a week): 960 packs a shift, 9,600 a week, £336 of contribution a shift, £8 of idle labour a shift.');
  });
});

describe('the mirage: a loss off the constraint', () => {
  it('30 minutes back, not one more pack, no contribution — the idle labour still said — and where the prize is', () => {
    const p = plan({ 'cause:Jams': 100 });
    const j = p.rows[0];
    expect([r2(j.backMin), j.packs, j.contribution, r2(j.labour)]).toEqual([30, 0, 0, 30]);
    expect(p.sentence).toBe('100% off jams on the Filler: 30 min a shift back and not one more pack — every loss chosen is off the constraint, which holds the line. The prize is at the constraint: breakdown on the Bagger, 40 min a shift.');
  });
});

describe('what it does not claim', () => {
  it('no running pattern: a shift only, the week asked for, never guessed', () => {
    const p = plan({ 'cause:Breakdown': 20 }, null);
    expect(p.week).toBeUndefined();
    expect(p.missing).toContain('A week needs the line’s running pattern (shifts a day, days a week) — set it on the line’s SMED.');
    expect(p.sentence).not.toMatch(/a week of/);
  });
  it('no margin and no crew on the bands: each named, nothing invented', () => {
    const bare = (): LossFigures => ({ ...shift(), bars: shift().bars.map(b => { const { contribution, labour, ...rest } = b as unknown as Record<string, unknown>; void contribution; void labour; return rest as unknown as LossFigures['bars'][number]; }) });
    const f = periodWaterfall([{ id: 'a', figures: bare() }], { name: 'Bagger', products: ['A'], others: [] });
    const p = leverPlan(f, leversOf(f, 120, { 'cause:Breakdown': 50 }, 10, 'packs'), { unit: 'packs' });
    expect(p.rows[0].contribution).toBeUndefined();
    expect(p.rows[0].labour).toBeUndefined();
    expect(p.missing).toEqual(expect.arrayContaining(['Give the line a margin a pack (Set up the line) to say the lost contribution.', 'Give the line its crew and a wage (Set up the line) to say the idle labour.']));
    expect(Math.round(p.rows[0].packs)).toBe(2400);
  });
  it('no lever slid: the module’s own prompt', () => {
    expect(plan({}).sentence).toBe('Slide a loss down to see what it gives back.');
    expect(plan({}).rows).toEqual([]);
  });
  it('the basis is the shifts counted', () => {
    expect(plan({ 'cause:Breakdown': 10 }).basis).toBe('2 shifts counted in the period, 900 planned minutes');
  });
});
