/* WHAT THE BOTTLENECK COSTS A PACK (lib/capacity bottleneckCost) — Rowland,
 * 17 October: "this is the cost per pack because of X, including with the
 * people". Worked by hand beside each figure. */
import { describe, expect, it } from 'vitest';
import { analyse, bottleneckCost, bottleneckCostSays, type Capacity } from '../capacity';

const line = (targetPerMin?: number): Capacity => ({ ...(targetPerMin != null ? { targetPerMin } : {}), stations: [
  { id: 'b', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min', source: 'plate' },
  { id: 'w', name: 'Wrapper', kind: 'machine', unit: 'bags', contains: 1, rate: 44, ratePer: 'min', source: 'plate' },
] });

describe('what the bottleneck costs a pack', () => {
  it('short of the target: labour a pack now and at the target, the difference because of it, a minute paid for packs not made, the contribution lost', () => {
    /* 4 people × £15 = £60 an hour. Now 44 a minute = 2,640 an hour → 2.27p a bag; at the 60 target 3,600 → 1.67p;
       0.61p a bag because of the Wrapper. A minute: £1 × (1 − 44 ÷ 60) = 26.7p; 16 bags × 4p margin = 64p. */
    const r = analyse(line(60));
    const k = bottleneckCost(r, 4, 15, 0.04);
    expect(k?.station).toBe('Wrapper');
    expect(k?.perPackNow).toBeCloseTo(0.022727, 6);
    expect(k?.perPackThen).toBeCloseTo(0.016667, 6);
    expect(k?.perMin).toBeCloseTo(0.26667, 5);
    expect(k?.contributionPerMin).toBeCloseTo(0.64, 9);
    expect(bottleneckCostSays(k as NonNullable<typeof k>, r)).toEqual({ short: true,
      text: 'Wrapper holds the line to 44 bags a minute against the 60 target: labour 2.27p a bag instead of 1.67p — 0.61p a bag because of Wrapper. Each minute 26.7p of labour is paid for bags not made, and 64p of contribution is lost.' });
  });
  it('no target, or one met: against the next station — what fixing it is worth a pack', () => {
    /* lifted to 70 (the Bagger): £60 ÷ 4,200 = 1.43p; 2.27 − 1.43 = 0.84p a bag */
    for (const cap of [line(), line(40)]) {
      const r = analyse(cap);
      const k = bottleneckCost(r, 4, 15);
      expect(bottleneckCostSays(k as NonNullable<typeof k>, r)).toEqual({ short: false,
        text: 'Wrapper sets the pace at 44 bags a minute: labour 2.27p a bag. Lifted to 70, where Bagger would hold it, it would be 1.43p — 0.84p a bag because of Wrapper.' });
    }
  });
  it('nothing without the people and their rate, or a line that can be counted', () => {
    expect(bottleneckCost(analyse(line(60)), undefined, 15)).toBeUndefined();
    expect(bottleneckCost(analyse(line(60)), 4, undefined)).toBeUndefined();
    expect(bottleneckCost(analyse({ stations: [] }), 4, 15)).toBeUndefined();
  });
});
