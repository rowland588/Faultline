import { describe, expect, it } from 'vitest';
import { analysisProblem, analysisSays, analysisFigures } from '../analysis';
import type { AgreedAnalysis, StudyReading } from '../../../lib/study';
import { ATTR_ACCEPT_ITEMS } from '../../../lib/ie/__tests__/attributeAgreement.test';

const mk = (): AgreedAnalysis => ({
  kind: 'attr', name: 'Seal wrinkle check',
  attr: { items: ATTR_ACCEPT_ITEMS, inspectors: ['A', 'B'], looks: 2 },
});

describe('analysis attr', () => {
  it('refuses empty name', () => {
    expect(analysisProblem({ kind: 'attr', name: '', attr: { items: [], inspectors: [] } })).toMatch(/judged/);
  });

  it('says verdict when complete', () => {
    const a = mk();
    const readings: StudyReading[] = [];
    const REF = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 10; i++) {
      readings.push({ id: `r${i}`, at: i, arm: ATTR_ACCEPT_ITEMS[i], col: 'reference', value: REF[i] });
      readings.push({ id: `a${i}1`, at: i, arm: ATTR_ACCEPT_ITEMS[i], col: 'A', group: 1, value: REF[i] });
      readings.push({ id: `a${i}2`, at: i, arm: ATTR_ACCEPT_ITEMS[i], col: 'A', group: 2, value: REF[i] });
      readings.push({ id: `b${i}1`, at: i, arm: ATTR_ACCEPT_ITEMS[i], col: 'B', group: 1, value: i === 1 ? 0 : REF[i] });
      readings.push({ id: `b${i}2`, at: i, arm: ATTR_ACCEPT_ITEMS[i], col: 'B', group: 2, value: REF[i] });
    }
    const f = analysisFigures(a, readings);
    const said = analysisSays(f, a);
    expect(said.text).toMatch(/Fleiss κ/);
    expect(said.text).toMatch(/B:/);
  });
});
