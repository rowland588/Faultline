import { describe, expect, it } from 'vitest';
import { KINDS, KINDS_BY_READINESS, OBJECTIVES, startable } from '../objectives';

describe('the studies a picker offers', () => {
  it('lists the measured first, then the partly measured, then the not available yet — every kind once', () => {
    expect(KINDS_BY_READINESS.map(g => g.readiness)).toEqual(['measured', 'partly', 'not-yet']);
    expect(KINDS_BY_READINESS.flatMap(g => g.kinds).sort()).toEqual([...KINDS].sort());
    expect(KINDS_BY_READINESS[0].kinds).toEqual(['balance', 'cycles']);
  });
  it('lets a study start only where something is measured from footage today', () => {
    for (const k of KINDS) expect(startable(k)).toBe(OBJECTIVES[k].readiness !== 'not-yet');
    expect(startable('balance')).toBe(true);
    expect(startable('waiting')).toBe(true);
    expect(startable('changeover')).toBe(false);
  });
});
