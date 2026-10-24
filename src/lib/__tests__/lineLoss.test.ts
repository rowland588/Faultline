/* A LINE'S LOST TIME IN ITS TWO PARTS (lib/lineLoss; docs/CAPACITY.md §6;
 * Rowland, 14 October: "capacity loss units and labour") — worked by hand.
 *
 * Line 7: 4 people at £12.50 an hour = £50 an hour of labour; rated at 70
 * packs a minute. Its Line capacity: Bagger 70 bags/min on the plate,
 * Basketer 5.5 baskets/min × 12 bags × 94% running = 62.04 bags/min —
 * the bottleneck.
 *
 * The stops: Basketer 6 min, Bagger 12 min, Whole line 3 min, none named 1.
 *   labour  = 22 min ÷ 60 × £50                 = £18.33 — every stop
 *   packs   = (6 + 3 + 1) min × 70              = 700 — the Bagger's 12 min
 *             are made up: the line runs round it
 *   not known (no Line capacity): 22 min × 70   = 1,540 — every stop counted
 *   a saving of 60 min of this scope: 60 × 10/22 = 27.27 min × 70 = 1,909.1 */
import { describe, it, expect } from 'vitest';
import { lostParts, lostWords, neckOf, packsForMs, packsHow, perHourWords, stopsTheLine } from '../lineLoss';
import { fmtPacks, labourPerMs } from '../cost';
import { weeklyLoss, headline } from '../stats';
import type { Capacity, Station } from '../../tools/linebalance/capacity';
import type { Standard } from '../../tools/linestandard/standard';
import type { Observation, Workspace } from '../../types';

const st = (o: Partial<Station> & { id: string; name: string; unit: string }): Station => ({ kind: 'machine', contains: 1, ratePer: 'min', ...o });
const CAP: Capacity = {
  stations: [
    st({ id: 'b', name: 'Bagger', unit: 'bags', rate: 70, source: 'plate' }),
    st({ id: 'k', name: 'Basketer', unit: 'baskets', contains: 12, rate: 5.5, runningPct: 94, source: 'timed' }),
  ],
};
const std = (o: Partial<Standard>): Standard => ({ id: 's', projectId: '', workspaceId: 'w7', product: 'Maris Piper 2kg', marks: [], sort: 0, createdAt: 1, updatedAt: 1, capacity: CAP, ...o } as Standard);
const W = { crew: 4, labourRatePerHour: 12.5, packsPerMin: 70 } as Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'packsPerMin'>;
const MIN = 60_000;
const stop = (asset: string, min: number, at = 0): Pick<Observation, 'durationMs' | 'asset' | 'startedAt' | 'category'> => ({ asset, durationMs: min * MIN, startedAt: at, category: 'Jam' });
const STOPS = [stop('Basketer', 6), stop('Bagger', 12), stop('Whole line', 3), stop('', 1)];

describe('the line’s bottleneck, from its Line capacity', () => {
  it('is the station each product is limited by', () => {
    expect(neckOf([std({})], 'w7')).toEqual({ names: ['Basketer'] });
  });
  it('is not known with no capacity counted, on another line, or deleted', () => {
    expect(neckOf([], 'w7')).toBeUndefined();
    expect(neckOf([std({ workspaceId: 'w2' })], 'w7')).toBeUndefined();
    expect(neckOf([std({ deletedAt: 5 })], 'w7')).toBeUndefined();
    expect(neckOf([std({ capacity: { stations: [] } })], 'w7')).toBeUndefined();
  });
  it('a stop stops the line on the bottleneck, the whole line or no machine; another machine’s does not', () => {
    const neck = neckOf([std({})], 'w7');
    expect(stopsTheLine({ asset: 'basketer ' }, neck)).toBe(true);
    expect(stopsTheLine({ asset: 'Whole line' }, neck)).toBe(true);
    expect(stopsTheLine({ asset: '' }, neck)).toBe(true);
    expect(stopsTheLine({ asset: 'Bagger' }, neck)).toBe(false);
    expect(stopsTheLine({ asset: 'Bagger' }, undefined)).toBe(true);
  });
});

describe('lost time in its two parts — never one £', () => {
  it('labour for every stop; packs only where the line stopped', () => {
    const p = lostParts(STOPS, W, neckOf([std({})], 'w7'));
    expect(p.labour).toBeCloseTo(18.333, 2);
    expect(p.packs).toBeCloseTo(700, 6);
    expect(p.neckKnown).toBe(true);
    expect(lostWords(p)).toBe('£18 labour · 700 packs lost');
  });
  it('with no Line capacity every stop is counted as stopping the line, and it says so', () => {
    const p = lostParts(STOPS, W, undefined);
    expect(p.packs).toBeCloseTo(1540, 6);
    expect(packsHow(p, undefined)).toMatch(/every stop counted as stopping the line/);
    expect(packsHow(lostParts(STOPS, W, neckOf([std({})], 'w7')), neckOf([std({})], 'w7'))).toMatch(/stops on the bottleneck \(Basketer\) or the whole line; a stop on another machine costs its labour\.$/);
  });
  it('each part only when the line has it — no rate, no crew, neither', () => {
    expect(lostWords(lostParts(STOPS, { crew: 4, labourRatePerHour: 12.5 }, undefined))).toBe('£18 labour');
    expect(lostWords(lostParts(STOPS, { packsPerMin: 70 }, undefined))).toBe('1,540 packs lost');
    expect(lostWords(lostParts(STOPS, {}, undefined))).toBe('');
    /* a machine the line runs round: its labour, and no packs */
    expect(lostWords(lostParts([stop('Bagger', 12)], W, neckOf([std({})], 'w7')))).toBe('£10 labour · no packs lost');
    expect(packsHow(lostParts(STOPS, { crew: 4, labourRatePerHour: 12.5 }, undefined), undefined)).toBe('');
  });
  it('a span of the scope’s time — a saving, a week — at the share that stopped the line', () => {
    expect(packsForMs(60 * MIN, STOPS, W, neckOf([std({})], 'w7'))).toBeCloseTo((60 * 10 / 22) * 70, 6);
    expect(packsForMs(60 * MIN, STOPS, {}, undefined)).toBeUndefined();
    expect(packsForMs(60 * MIN, [], W, undefined)).toBeUndefined();
  });
  it('an hour of it, for the line’s facts', () => {
    expect(perHourWords(W)).toBe('£50/hr labour while it is down · 70 packs a minute lost when it stops the line');
    expect(perHourWords({ crew: 4, labourRatePerHour: 12.5, labourBurden: 1.3 })).toBe('£65/hr labour while it is down');
    expect(perHourWords({})).toBe('');
  });
  it('the £ a millisecond the screens multiply time by is labour alone', () => {
    expect(labourPerMs({ ...W }) * 3_600_000).toBeCloseTo(50, 9);
    expect(labourPerMs({ packsPerMin: 70 })).toBe(0);
  });
  it('packs as a person says them', () => {
    expect(fmtPacks(0.4)).toBe('under 1 pack');
    expect(fmtPacks(1)).toBe('1 pack');
    expect(fmtPacks(1240.4)).toBe('1,240 packs');
    expect(fmtPacks(0)).toBe('0 packs');
  });
});

describe('a week’s loss carries its packs (lib/stats)', () => {
  it('each week: labour in £, the packs not made — at the bottleneck', () => {
    const now = Date.now();
    const rows = STOPS.map(s => ({ ...s, startedAt: now, id: s.asset || 'none', workspaceId: 'w7' })) as unknown as Observation[];
    const ws = { ...W, id: 'w7' } as unknown as Workspace;
    const cur = weeklyLoss(rows, ws, 2, neckOf([std({})], 'w7')).find(w => w.current);
    expect(cur?.cost).toBeCloseTo(18.333, 2);
    expect(cur?.packs).toBeCloseTo(700, 6);
    expect(weeklyLoss(rows, { ...ws, packsPerMin: undefined } as Workspace, 2).find(w => w.current)?.packs).toBeUndefined();
    expect(headline(weeklyLoss(rows, ws, 2), ws).costable).toBe(true);
  });
});
