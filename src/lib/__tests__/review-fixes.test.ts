/* THE INDEPENDENT REVIEW'S FINDINGS, LOCKED (docs/UPGRADE-AUDIT.md §8).
 * Each test here is a defect the review of 16 October found in the upgrade's
 * own waves, with the figure it should have said. */
import { describe, expect, it } from 'vitest';
import { analyse, screenCapacity, shiftCapacity, vCurve, type Capacity, type Station } from '../../tools/linebalance/capacity';
import { readRun, runLine, runShort } from '../run';
import { quarters } from '../measures';
import { gantt } from '../gantt';
import { actionWords, planWords } from '../../tools/changeover/changeover';

type ChangeoverStep = Parameters<typeof planWords>[0];

let n = 0;
const m = (name: string, unit: string, speed: Partial<Station>, x: Partial<Station> = {}): Station =>
  ({ id: `s${++n}`, name, kind: 'machine', unit, contains: 1, ...speed, source: 'plate', ...x });

describe('review — lines that merge (M4)', () => {
  it('the shared station’s check counts what arrives against its own figure: 2 × 90 ÷ 85 → 3 of them, not 2', () => {
    /* Line A: bagger 100 → weigher 300 rejecting 10% → shared packer 2 × 42.5 = 85, target 200.
       90 arrive at the packer; it takes 85; like for like at the line's start that is 94.4. */
    const cap: Capacity = { targetPerMin: 200, lanes: [{ id: 'A', name: 'Line A' }], stations: [
      { ...m('bagger', 'bags', { rate: 100, ratePer: 'min' }), lane: 'A' },
      { ...m('weigher', 'bags', { rate: 300, ratePer: 'min' }, { goodPct: 90 }), lane: 'A' },
      m('packer', 'bags', { rate: 42.5, ratePer: 'min' }, { crew: 2 })] };
    const r = analyse(cap);
    expect(r.lanes?.heldBy).toBe('shared');
    expect(r.limit?.station.name).toBe('packer');
    expect(r.line).toBeCloseTo(85 / 0.9, 6);
    expect(r.sentence).toContain('packer holds Line A to 85 bags/min — 90 bags/min arrive at it (94.4 bags/min like for like at the lines’ start)');
    const text = screenCapacity(cap, r).map(c => c.text).join(' ');
    expect(text).toContain('holds Line A to 85 bags a minute (94.4 bags a minute like for like at the lines’ start)');
    expect(text).toContain('3 of them running (it has 2)');
  });
  it('one line feeding shared stations is one line: the shift names its bottleneck and the V draws the shared stations (M5)', () => {
    const cap: Capacity = { lanes: [{ id: 'A', name: 'Line A' }], stations: [
      { ...m('bagger', 'bags', { rate: 100, ratePer: 'min' }), lane: 'A' }, m('packer', 'bags', { rate: 200, ratePer: 'min' })] };
    const r = analyse(cap);
    expect(r.lanes?.heldBy).toBe('lanes');
    const c = shiftCapacity(r, [{ name: 'Days', min: 480, breakMin: 30 }]);
    expect(c?.sentence).toContain('At bagger’s 100 bags a minute');
    expect(c?.sentence).not.toContain('together');
    const v = vCurve(r);
    expect(v.points.map(p => p.name)).toEqual(['bagger', 'packer']);
    expect(v.points[1].pct).toBeCloseTo(200, 6);
    expect(v.limit?.name).toBe('bagger');
    expect(v.sentence).toContain('after they merge: the stations after the merge run against the 100 bags a minute the lines send.');
  });
});

describe('review — a run’s figures (M12)', () => {
  const T = (packs: number, minutes: number) => ({ run: { packs, minutes }, runAgreed: { rate: 60 } });
  it('the square says what the line says: 59.96 of 60, never 60 of 60 in red', () => {
    expect(runShort(T(2998, 50))).toBe('59.96 of 60 ppm');
    expect(runLine(T(2998, 50) as never)).toContain('59.96 ppm');
  });
  it('a miss two places cannot show is said to three', () => {
    const r = readRun(T(29999, 500));
    const rate = r.checks.find(c => c.what === 'rate');
    expect(rate?.ok).toBe(false);
    expect(rate?.got).toBe('59.998 ppm');
    expect(rate?.gap).toBe('0.002 ppm short');
    expect(runShort(T(29999, 500))).toBe('59.998 of 60 ppm');
  });
  it('a met rate is said plainly', () => {
    expect(runShort(T(3000, 50))).toBe('60 of 60 ppm');
    expect(readRun(T(3000, 50)).checks.find(c => c.what === 'rate')?.ok).toBe(true);
  });
});

describe('review — days are the reader’s own (R1)', () => {
  it('the Gantt’s days run one a column from a Monday, whatever the zone', () => {
    const g = gantt([], { today: '2026-10-16', expectedAt: '2026-11-20' });
    expect(g.dayList.length).toBeGreaterThan(7);
    expect(g.dayList[0].dow).toBe(0);
    const noon = (iso: string) => Date.parse(`${iso}T12:00:00`);
    /* rounded: across a clock change the local day is 23 or 25 hours long */
    for (let i = 1; i < g.dayList.length; i++) expect(Math.round((noon(g.dayList[i].iso) - noon(g.dayList[i - 1].iso)) / 86_400_000)).toBe(1);
    for (const d of g.dayList) expect(d.dow).toBe((new Date(noon(d.iso)).getDay() + 6) % 7);
  });
  it('quarters from 1 January start on 1 January, whatever the zone', () => {
    const qs = quarters('2026-01-01', () => 'q');
    expect(qs.map(q => [q.from, q.to])).toEqual([
      ['2026-01-01', '2026-03-31'], ['2026-04-01', '2026-06-30'], ['2026-07-01', '2026-09-30'], ['2026-10-01', '2026-12-31']]);
    expect(quarters('2026-13-01', () => 'q')).toEqual([]);
  });
});

describe('review — SMED words follow the ladder (M14)', () => {
  const st = { id: 'e1', name: 'Change the jaws', order: 1, side: 'internal', sec: 16 * 60, plan: { kind: 'streamline', targetSec: 29 * 60 } } as unknown as ChangeoverStep;
  it('a target typed no shorter than the time is said so, not printed as a saving', () => {
    expect(planWords(st)).toBe('Streamline: 16 min stands — the target typed (29 min) is no shorter');
    expect(actionWords(st)).toBe('streamline, 16 min — the target typed (29 min) is no shorter, so 16 min stands');
  });
  it('a real target still reads as before', () => {
    const real = { ...st, plan: { kind: 'streamline', targetSec: 4 * 60 } } as unknown as ChangeoverStep;
    expect(planWords(real)).toBe('Streamline: 16 min → 4 min');
    expect(actionWords(real)).toBe('streamline, 16 min → 4 min');
  });
});
