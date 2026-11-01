/* FC-046 accumulation: how long a buffer holds, how fast it comes back, what a stop longer than it costs
 * (knowledge/specs/FC-046-accumulation.md). Every figure is one scripts/knowledge/cases-toc.py prints from plain arithmetic —
 * the record's worked case (a filler at 100/min feeding the bagger, critical at 90/min, through 600 packs) and a stop list. */
import { describe, expect, it } from 'vitest';
import { analyse, type Station } from '../capacity';
import { bufferView, MIN_STOPS, p90, stopLengths } from '../capacityBuffer';
import type { Observation } from '../../../types';

const st = (o: Partial<Station> & { name: string }): Station => ({ id: o.name, kind: 'machine', unit: 'packs', contains: 1, ratePer: 'min', source: 'plate', ...o });
const FILLER_BAGGER: Station[] = [st({ name: 'Filler', rate: 100, bufferAfter: 600 }), st({ name: 'Bagger', rate: 90 })];
const STOPS = [2, 3, 3, 4, 5, 6, 8, 12, 15, 20];
const lengths = (xs: number[], id = 'Filler') => ({ [id]: [...xs].sort((a, b) => a - b) });
const r = (x: number) => Math.round(x * 1000) / 1000;

describe('the record’s worked case', () => {
  const v = bufferView(analyse({ stations: FILLER_BAGGER }), { lengths: lengths(STOPS), contributionPerPack: 0.4, plannedMin: 2400 });
  const row = v?.rows[0];
  it('cover is the units over the bottleneck’s speed, recovery over the difference', () => {
    expect(v?.bottleneck).toBe('Bagger');
    expect(r(row?.coverMin ?? 0)).toBe(6.667);                   // 600 ÷ 90
    expect(row?.recoveryMin).toBe(60);                           // 600 ÷ (100 − 90)
    expect(row?.side).toBe('before');
  });
  it('a stop shorter than the cover is absorbed; longer, the bottleneck starves for the rest', () => {
    expect([row?.stops, row?.absorbed, row?.passed]).toEqual([10, 6, 4]);
    expect(r(row?.lostMin ?? 0)).toBe(28.333);                   // 1.333 + 5.333 + 8.333 + 13.333
    expect(Math.round(row?.lostUnits ?? 0)).toBe(2550);          // × 90
    expect(Math.round(row?.lostPounds ?? 0)).toBe(1020);         // × 40p
  });
  it('the buffer that covers the 90th percentile (nearest rank, 15 min) is 1,350 packs', () => {
    expect(row?.p90Min).toBe(15);
    expect(row?.needUnits).toBe(1350);
  });
  it('the single record’s stop of 12 minutes starves the bagger 5.333 minutes — 480 packs, £192', () => {
    const one = bufferView(analyse({ stations: FILLER_BAGGER }), { lengths: lengths([12]), contributionPerPack: 0.4 })?.rows[0];
    expect([r(one?.lostMin ?? 0), Math.round(one?.lostUnits ?? 0), Math.round((one?.lostPounds ?? 0) * 100) / 100]).toEqual([5.333, 480, 192]);
    expect(one?.needUnits).toBeUndefined();                      // one stop is not enough to size from
    expect(one?.says).toContain(`Only 1 stop logged — ${MIN_STOPS} are wanted`);
  });
  it('the buffer is back before the next stop only if recovery is shorter than the gap between stops', () => {
    expect(row?.betweenMin).toBeCloseTo((2400 - 78) / 10, 6);
    expect(row?.refills).toBe(true);
    const tight = bufferView(analyse({ stations: FILLER_BAGGER }), { lengths: lengths(STOPS), plannedMin: 600 })?.rows[0];
    expect(tight?.betweenMin).toBeCloseTo((600 - 78) / 10, 6);   // 52.2 min between stops, 60 to come back
    expect(tight?.refills).toBe(false);
    expect(tight?.says).toContain('it is never full again before the next stop');
    expect(tight?.tone).toBe('a');
  });
});

describe('more refill and more cover', () => {
  it('a 25% margin refills the 600 in 26.67 minutes; a 10% margin in 66.7', () => {
    const at = (rate: number) => bufferView(analyse({ stations: [st({ name: 'Filler', rate, bufferAfter: 600 }), st({ name: 'Bagger', rate: 90 })] }), { lengths: lengths([1]) })?.rows[0].recoveryMin ?? 0;
    expect(Math.round(at(112.5) * 100) / 100).toBe(26.67);
    expect(Math.round(at(99) * 10) / 10).toBe(66.7);
  });
  it('a neighbour no faster than the bottleneck never refills — said', () => {
    /* the bagger sets the pace on its stops (85.5 once they count) though both are plate 90: running they are equal */
    const slow = bufferView(analyse({ stations: [st({ name: 'Filler', rate: 90, bufferAfter: 600 }), st({ name: 'Bagger', rate: 90, runningPct: 95 })] }), { lengths: lengths([1]) })?.rows[0];
    expect(slow?.recoveryMin).toBeUndefined();
    expect(slow?.says).toContain('runs no faster than Bagger');
  });
  it('the refill is at the slowest speed the product meets on its way: a feeder at 120 with a filler at 100 between, the bagger at 90 → 10 a minute', () => {
    const line = [st({ name: 'Feeder', rate: 120, bufferAfter: 300 }), st({ name: 'Filler', rate: 100, bufferAfter: 300 }), st({ name: 'Bagger', rate: 90 })];
    const row = bufferView(analyse({ stations: line }), { lengths: lengths([3], 'Feeder') })?.rows.find(x => x.name === 'Feeder');
    expect(row?.units).toBe(600);
    expect(row?.gapPerMin).toBe(10);
    expect(row?.recoveryMin).toBe(60);
  });
  it('after the bottleneck the stop blocks it, and the buffer drains at the stopped station’s speed less the bottleneck’s', () => {
    const line = [st({ name: 'Bagger', rate: 90, bufferAfter: 450 }), st({ name: 'Case packer', rate: 100 })];
    const row = bufferView(analyse({ stations: line }), { lengths: lengths([8], 'Case packer') })?.rows[0];
    expect([row?.side, row?.coverMin, row?.recoveryMin, row?.passed]).toEqual(['after', 5, 45, 1]);
    expect(row?.says).toContain('blocked for 3 min');
  });
});

describe('stops: only a neighbour’s own, timed ones', () => {
  const ob = (o: Partial<Observation>): Observation => ({ id: Math.random().toString(), workspaceId: 'w', category: 'Jam', asset: 'Filler', startedAt: 1000, durationMs: 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: 0, updatedAt: 0, ...o });
  it('a changeover, a wait on a neighbour, an untimed stop and a stop outside the window are left out; a tally is its mean, that many times', () => {
    const got = stopLengths([
      ob({ durationMs: 120_000 }), ob({ durationMs: 300_000 }), ob({ category: 'Changeover', durationMs: 999_000 }), ob({ category: 'Waiting', durationMs: 800_000 }),
      ob({ durationMs: 0 }), ob({ startedAt: 5000, durationMs: 700_000 }), ob({ durationMs: 360_000, count: 3 }), ob({ asset: 'Somewhere else' }), ob({ deletedAt: 5, durationMs: 90_000 }),
    ], FILLER_BAGGER, 0, 2000);
    expect(got.Filler).toEqual([2, 2, 2, 2, 5]);
    expect(got.Bagger).toEqual([]);
  });
  it('the nearest-rank 90th percentile', () => {
    expect(p90(STOPS)).toBe(15);
    expect(p90([4])).toBe(4);
    expect(p90([])).toBeUndefined();
  });
});

describe('what it does not say', () => {
  it('nothing written down as collecting: said, and no money claimed', () => {
    const v = bufferView(analyse({ stations: [st({ name: 'Filler', rate: 100 }), st({ name: 'Bagger', rate: 90 })] }), { lengths: lengths(STOPS), contributionPerPack: 0.4 });
    expect(v?.written).toBe(false);
    expect(v?.sentence).toMatch(/^Nothing is written down as collecting between the stations — a stop next to Bagger stops Bagger\./);
    expect(v?.rows[0].lostPounds).toBeUndefined();
    expect(v?.money).toBeUndefined();
  });
  it('no margin on the line: the packs are said and the missing input named, nothing invented', () => {
    const v = bufferView(analyse({ stations: FILLER_BAGGER }), { lengths: lengths(STOPS) });
    expect(Math.round(v?.rows[0].lostUnits ?? 0)).toBe(2550);
    expect(v?.rows[0].lostPounds).toBeUndefined();
    expect(v?.money).toBeUndefined();
    expect(v?.missing).toContain('Give the line a margin a pack (Set up the line) to say what the starved minutes cost.');
    expect(v?.missing).toContain('Give the planned hours a week on the sheet to say whether the buffer is back before the next stop.');
  });
  it('a buffer big enough absorbs every logged stop and says so', () => {
    const big = [st({ name: 'Filler', rate: 100, bufferAfter: 2000 }), st({ name: 'Bagger', rate: 90 })];
    const v = bufferView(analyse({ stations: big }), { lengths: lengths(STOPS) });
    expect(v?.sentence).toMatch(/^Every logged stop beside Bagger \(10\) is absorbed/);
    expect(v?.tone).toBe('n');
  });
  it('no line, no bottleneck, no speed: nothing', () => {
    expect(bufferView(analyse({ stations: [] }))).toBeUndefined();
  });
  it('a buffer with no stops logged still says its cover and recovery', () => {
    const v = bufferView(analyse({ stations: FILLER_BAGGER }), {});
    expect(v?.rows[0].says).toMatch(/^What can collect between the filler and Bagger \(600 packs\) holds 6\.7 min of Bagger’s work/);
    expect(v?.sentence).toMatch(/No stops are logged on the machines beside Bagger/);
  });
});
