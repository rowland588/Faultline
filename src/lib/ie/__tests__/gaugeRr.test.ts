/* FC-118 gauge R&R — crossed ANOVA (scripts/knowledge/cases-msa.py). */
import { describe, expect, it } from 'vitest';
import { gaugeRr, type GrrCell } from '../gaugeRr';

export const SEAL_LINES = `12.0 A 1 11.69
12.0 A 2 12.07
12.0 B 1 12.42
12.0 B 2 12.18
12.0 C 1 11.82
12.0 C 2 11.51
13.5 A 1 13.16
13.5 A 2 13.17
13.5 B 1 13.85
13.5 B 2 13.99
13.5 C 1 13.16
13.5 C 2 13.78
11.2 A 1 11.43
11.2 A 2 11.0
11.2 B 1 11.45
11.2 B 2 11.72
11.2 C 1 10.93
11.2 C 2 11.09
14.8 A 1 14.94
14.8 A 2 15.0
14.8 B 1 14.96
14.8 B 2 15.62
14.8 C 1 14.61
14.8 C 2 14.71
12.6 A 1 12.46
12.6 A 2 12.5
12.6 B 1 13.56
12.6 B 2 12.68
12.6 C 1 12.08
12.6 C 2 12.02
13.1 A 1 13.1
13.1 A 2 13.48
13.1 B 1 13.65
13.1 B 2 13.21
13.1 C 1 12.92
13.1 C 2 12.92
11.8 A 1 12.05
11.8 A 2 11.94
11.8 B 1 11.81
11.8 B 2 12.01
11.8 C 1 11.46
11.8 C 2 11.22
14.2 A 1 13.76
14.2 A 2 14.4
14.2 B 1 14.53
14.2 B 2 14.73
14.2 C 1 13.95
14.2 C 2 13.89
12.9 A 1 13.19
12.9 A 2 13.11
12.9 B 1 13.76
12.9 B 2 13.25
12.9 C 1 12.61
12.9 C 2 12.55
13.7 A 1 13.72
13.7 A 2 13.75
13.7 B 1 14.54
13.7 B 2 14.1
13.7 C 1 13.21
13.7 C 2 13.33`;

const SEAL: GrrCell[] = SEAL_LINES.trim().split('\n').map(line => {
  const [part, appraiser, trial, value] = line.split(' ');
  return { part, appraiser, trial: Number(trial), value: Number(value) };
});

describe('gauge R&R ANOVA', () => {
  it('refuses an incomplete grid', () => {
    expect(gaugeRr({ cells: [{ part: '1', appraiser: 'A', trial: 1, value: 1 }] })).toBeUndefined();
  });

  it('the seal case: pooled interaction, %GRR 34.8%, ndc 3, not acceptable (cases-msa.py)', () => {
    const r = gaugeRr({ cells: SEAL, tolerance: 6 });
    expect(r).toBeDefined();
    expect(r!.var.pooled).toBe(true);
    expect(r!.pctGrrTotal).toBeCloseTo(34.8, 0);
    expect(r!.pctContrib).toBeCloseTo(12.1, 0);
    expect(r!.pctGrrTol).toBeCloseTo(43, 0);
    expect(r!.ndc).toBe(3);
    expect(r!.band).toBe('not');
    expect(r!.ev).toBeCloseTo(0.25, 1);
    expect(r!.av).toBeCloseTo(0.35, 1);
    expect(r!.pv).toBeCloseTo(1.16, 1);
  });
});
