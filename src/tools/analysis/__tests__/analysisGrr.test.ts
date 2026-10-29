import { describe, expect, it } from 'vitest';
import { analysisClosing, analysisFigures, analysisProblem, analysisSays, analysisTiles } from '../analysis';
import type { AgreedAnalysis } from '../../../lib/study';
import { SEAL_LINES } from '../../../lib/ie/__tests__/gaugeRr.test';

const mk = (extra: Partial<AgreedAnalysis['grr']> = {}): AgreedAnalysis => ({
  kind: 'grr', name: 'Seal strength', unit: 'N',
  grr: {
    parts: ['12.0', '13.5', '11.2', '14.8', '12.6', '13.1', '11.8', '14.2', '12.9', '13.7'],
    appraisers: ['A', 'B', 'C'], trials: 2, lower: 10, upper: 16, ...extra,
  },
});

const readings = SEAL_LINES.trim().split('\n').map((line, i) => {
  const [arm, col, group, value] = line.split(' ');
  return { id: `r${i}`, at: i, arm, col, group: Number(group), value: Number(value) };
});

describe('Analysis gauge R&R (FC-118)', () => {
  it('refuses until parts and appraisers are named', () => {
    expect(analysisProblem({ kind: 'grr', name: '', grr: { parts: [], appraisers: [] } })).toMatch(/Which gauge/);
    expect(analysisProblem(mk({ parts: ['1', '2'] }))).toMatch(/At least 5 parts/);
  });

  it('the seal case says not acceptable with %GRR about 35%', () => {
    const a = mk();
    const f = analysisFigures(a, readings);
    const s = analysisSays(f, a);
    expect(s.verdict).toBe('Not acceptable');
    expect(s.text).toMatch(/34\.8%/);
    expect(s.text).toMatch(/Reproducibility is the larger part/);
    expect(analysisTiles(f, a)[0].v).toMatch(/34/);
    expect(analysisClosing(f, a, s).text).toMatch(/Not acceptable/);
  });
});
