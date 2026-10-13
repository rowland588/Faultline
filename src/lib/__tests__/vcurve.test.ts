/* The V-curve (docs/CAPACITY.md §4), on a worked example written out by hand.
 *
 * Line 7, bags a minute at the start of the line:
 *   Weigher     90 a min on the plate, 95% running      → 85.5
 *   Bagger      75 a min on the plate, 94% running      → 70.5
 *   Op 3        a basket of 12 every 12 s               → 5 baskets = 60.0   ← the bottleneck
 *   Lidder      5.3 baskets a min on the plate          → 63.6
 *   Palletiser  0.15 pallets of 48 baskets, 97% running → 0.15 × 48 × 12 × 0.97 = 83.8
 * As shares of the bottleneck's 60: 142.5 · 117.5 · 100 · 106 · 139.7.
 * With a 10% margin the guide is 120 · 110 · — · 110 · 120: the lidder, at 106,
 * is under it — downstream, so its short stop blocks Op 3. */
import { describe, it, expect } from 'vitest';
import { analyse, vCurve, type Station } from '../capacity';

const st = (o: Partial<Station> & { name: string; unit: string }): Station => ({ id: o.name, kind: 'machine', contains: 1, ...o });
const LINE: Station[] = [
  st({ name: 'Weigher', unit: 'bags', rate: 90, ratePer: 'min', runningPct: 95, source: 'plate' }),
  st({ name: 'Bagger', unit: 'bags', rate: 75, ratePer: 'min', runningPct: 94, source: 'plate' }),
  st({ name: 'Op 3', kind: 'people', unit: 'baskets', contains: 12, cycleSec: 12, perCycle: 1, source: 'timed' }),
  st({ name: 'Lidder', unit: 'baskets', contains: 1, rate: 5.3, ratePer: 'min', source: 'plate' }),
  st({ name: 'Palletiser', unit: 'pallets', contains: 48, rate: 0.15, ratePer: 'min', runningPct: 97, source: 'plate' }),
];

describe('the V-curve', () => {
  it('each station as a share of the bottleneck, in flow order', () => {
    const v = vCurve(analyse({ stations: LINE }), 10);
    expect(v.limit?.name).toBe('Op 3');
    expect(v.points.map(p => Math.round(p.pct * 10) / 10)).toEqual([142.5, 117.5, 100, 106, 139.7]);
    expect(v.points.map(p => p.guide)).toEqual([120, 110, undefined, 110, 120]);
    expect(v.points.map(p => p.steps)).toEqual([-2, -1, 0, 1, 2]);
  });
  it('a station under the guide is said, with which way it hurts the bottleneck', () => {
    const v = vCurve(analyse({ stations: LINE }), 10);
    expect(v.under.map(p => p.name)).toEqual(['Lidder']);
    expect(v.sentence).toBe('The lidder is only 6% faster than Op 3 (the V asks 10%) — a short stop there blocks Op 3.');
  });
  it('upstream, a station under the guide starves the bottleneck', () => {
    const slowBagger = LINE.map(x => (x.name === 'Bagger' ? { ...x, rate: 66 } : x));   // 66 × 0.94 = 62.0 → 103%
    const v = vCurve(analyse({ stations: slowBagger }), 10);
    expect(v.under.map(p => p.name)).toEqual(['Bagger', 'Lidder']);
    expect(v.sentence).toMatch(/^The bagger is only 3% faster than Op 3 \(the V asks 10%\) — a short stop there starves Op 3; the lidder/);
  });
  it('every station clear of the V says so', () => {
    const fastLidder = LINE.map(x => (x.name === 'Lidder' ? { ...x, rate: 6 } : x));   // 72 → 120%
    expect(vCurve(analyse({ stations: fastLidder }), 10).sentence).toBe('Every station clears the V: each step away from Op 3 is at least 10% faster, so a short stop beside it is absorbed.');
  });
  it('no margin set: no guide is drawn, and the owner is asked to set it — never assumed', () => {
    const v = vCurve(analyse({ stations: LINE }));
    expect(v.points.every(p => p.guide === undefined && !p.under)).toBe(true);
    expect(v.sentence).toMatch(/^Op 3 is the bottleneck at 60 bags a minute\. Set the V's margin/);
  });
  it('a person\'s basket size moves the bottleneck — 10 to a basket and the lidder holds the line', () => {
    const tens = LINE.map(x => (x.name === 'Op 3' ? { ...x, contains: 10, cycleSec: 10.5 } : x));
    const v = vCurve(analyse({ stations: tens }), 10);
    expect(v.limit?.name).toBe('Lidder');
    expect(Math.round((v.limit?.perMin ?? 0) * 10) / 10).toBe(53);
  });
  it('nothing to draw without stations', () => {
    expect(vCurve(analyse({ stations: [] }), 10).points).toEqual([]);
  });
});

/* ACCUMULATION on the same line (docs/CAPACITY.md §4), worked by hand:
 * Op 3 is the bottleneck at 60 bags a minute. The bagger's own stops: 24 min
 * in 8 stops → 3 min typical; 120 bags can collect after the bagger → 2 min
 * of Op 3's work: not covered — a typical stop starves Op 3. The lidder's own
 * stops: 10 min in 10 → 1 min typical; 15 baskets can collect after Op 3
 * (180 bags) → 3 min: covered. */
import { accumulation } from '../capacity';
describe('accumulation beside the bottleneck', () => {
  const withBuffers = LINE.map(x => (x.name === 'Bagger' ? { ...x, bufferAfter: 120 } : x.name === 'Op 3' ? { ...x, bufferAfter: 15 } : x));
  const stats = { Bagger: { ownMins: 24, waitMins: 0, events: 8, ownEvents: 8 }, Lidder: { ownMins: 10, waitMins: 2, events: 12, ownEvents: 10 } };
  it('a typical stop against what can collect between it and the bottleneck, in the bottleneck\'s minutes', () => {
    const a = accumulation(analyse({ stations: withBuffers }), stats);
    expect(a.rows.map(p => [p.name, p.side, p.typicalMin, Math.round(p.coverMin * 100) / 100, p.covered])).toEqual([['Bagger', 'before', 3, 2, false], ['Lidder', 'after', 1, 3, true]]);
    expect(a.sentence).toBe("The bagger's own stops last 3 min on average; what can collect between it and Op 3 holds 2 min of Op 3's work — a typical stop there starves Op 3.");
  });
  it('nothing written down as collecting: said, and what to write', () => {
    expect(accumulation(analyse({ stations: LINE }), stats).sentence).toMatch(/^Nothing is written down as collecting between the stations — a stop next to Op 3 stops Op 3\./);
  });
  it('everything covered says so; no logged stops says nothing', () => {
    const big = withBuffers.map(x => (x.name === 'Bagger' ? { ...x, bufferAfter: 300 } : x));
    expect(accumulation(analyse({ stations: big }), stats).sentence).toBe('Every logged stop beside Op 3 is absorbed: what can collect covers the typical stop of each.');
    expect(accumulation(analyse({ stations: withBuffers }), {}).sentence).toBe('');
  });
  it('the cover is in minutes of the bottleneck RUNNING: Op 3 at 90% still draws 60 bags a minute while the bagger is stopped', () => {
    /* 130 bags after the bagger ÷ Op 3's 60 a minute running = 2.17 min, against the bagger's typical 23 ÷ 10 = 2.3 min
       stop: not covered. Divided by Op 3's 54 once its own stops count it read 2.41 — covered, which it is not. */
    const op3stops = withBuffers.map(x => (x.name === 'Bagger' ? { ...x, bufferAfter: 130 } : x.name === 'Op 3' ? { ...x, runningPct: 90 } : x));
    const r = analyse({ stations: op3stops });
    expect([r.limit?.station.name, r.line]).toEqual(['Op 3', 54]);
    const a = accumulation(r, { Bagger: { ownMins: 23, waitMins: 0, events: 10, ownEvents: 10 } });
    expect(a.rows.map(p => [p.name, Math.round(p.coverMin * 1000) / 1000, Math.round(p.typicalMin * 10) / 10, p.covered])).toEqual([['Bagger', 2.167, 2.3, false]]);
  });
});
