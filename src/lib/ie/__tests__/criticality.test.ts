import { describe, expect, it } from 'vitest';
import { rankCriticality, rankOne } from '../criticality';

describe('equipment criticality (cases-maintenance.py)', () => {
  const rows = [
    { id: '1', name: 'Wrapper jaws', production: 5, safety: 3, quality: 3, repair: 4, likelihood: 4 },
    { id: '2', name: 'Checkweigher', production: 5, safety: 5, quality: 5, repair: 3, likelihood: 2, ccp: true },
    { id: '3', name: 'Conveyor 3', production: 2, safety: 1, quality: 1, repair: 2, likelihood: 4 },
    { id: '4', name: 'Label printer', production: 3, safety: 1, quality: 3, repair: 2, likelihood: 3 },
    { id: '5', name: 'Spare pump', production: 1, safety: 1, quality: 1, repair: 1, likelihood: 2, standby: true },
  ];

  it('scores the worked case', () => {
    expect(rankOne(rows[0])?.score).toBe(20);
    expect(rankOne(rows[0])?.class).toBe('A');
    expect(rankOne(rows[1])?.score).toBe(10);
    expect(rankOne(rows[1])?.class).toBe('A');
    expect(rankOne(rows[2])?.class).toBe('B');
    expect(rankOne(rows[3])?.class).toBe('B');
    expect(rankOne(rows[4])?.class).toBe('C');
  });

  it('summarizes class counts', () => {
    const out = rankCriticality(rows);
    expect('ok' in out && out.ok).toBeTruthy();
    if (!('ok' in out)) return;
    expect(out.counts.A).toBe(2);
    expect(out.counts.B).toBe(2);
    expect(out.counts.C).toBe(1);
  });
});
