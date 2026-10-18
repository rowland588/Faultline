/* FAULTLINE'S LIBRARY — every entry a method the validator keeps and the
 * runtime runs, built from the app's tools and measures; and the library
 * found from a person's own words, with no assistant. */
import { describe, expect, it } from 'vitest';
import { LIBRARY, closest } from '../library';
import { validateDefinition } from '../validate';
import { readFlow } from '../runtime';
import { allSteps } from '../definition';

describe('Faultline’s library', () => {
  it('is methods like any other — each one valid, runnable, and using what it says it uses', () => {
    for (const e of LIBRARY) {
      const c = validateDefinition(e.build());
      expect(c.errors, e.id).toEqual([]);
      const s = readFlow({ def: c.def!, records: [], machines: [{ id: 'm1', name: 'Bagger' }], today: '2026-10-18', startedOn: '2026-10-01' });
      expect(s.stages.length, e.id).toBeGreaterThan(1);
      const tools = allSteps(c.def!).filter(r => r.step.component).length;
      expect(tools > 0, e.id).toBe(e.uses.length > 0);
      if (e.kind !== 'stagegate') expect(c.def!.measures?.length, e.id).toBeGreaterThan(0);
    }
  });

  it('measures SMED’s changeover from the first timing to the last, against single-digit minutes', () => {
    const def = LIBRARY.find(e => e.id === 'changeover-reduction')!.build();
    expect(def.measures?.[0]).toMatchObject({ name: 'Changeover minutes', target: 9, better: 'lower' });
    expect(def.measures?.[0].from.map(f => f.step)).toEqual(['time-now', 'time-again', 'hold']);
  });

  it('is found from the person’s own words', () => {
    const ids = (said: string) => closest(said, LIBRARY).map(e => e.id);
    expect(ids('Our changeovers on the bagger take 45 minutes and we need them quicker')[0]).toBe('changeover-reduction');
    expect(ids('Line 4 keeps missing its packs a shift target, we need the root cause')[0]).toBe('line-performance');
    expect(ids('We are installing a new tray sealer from the OEM and need to commission it')[0]).toBe('stage-gate');
    expect(ids('A new product trial for a customer next month')[0]).toBe('product-trial');
    expect(ids('The wrapper is our bottleneck and we cannot make the rate')[0]).toBe('line-rate');
    /* footage of the line is read as a line balance (lib/video) — a method that uses one is the one offered */
    expect(ids('I have filmed the line and want to see who is waiting')[0]).toBe('line-rebalance');
    /* a tool made from blocks — a log worked out as a Pareto, a trend and a figure a day */
    expect(ids('We need to track every reject on the tray sealer and find the biggest reason')[0]).toBe('rejects-log');
    /* statistical process control, made of the control chart and the spread */
    expect(ids('The fill weight on the depositor keeps drifting and we want it held in control')[0]).toBe('held-in-control');
    expect(ids('zzz qqq')).toEqual([]);
  });
});
