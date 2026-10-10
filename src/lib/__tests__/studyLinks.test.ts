import { describe, it, expect } from 'vitest';
import { linkedTo, beforeAfter, proveItFrom, readingsFor, owedOf, betterWords, worthBetter, studyLine, sameScope } from '../studyLinks';
import type { ToolStudy } from '../study';

const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
  401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
const agreed = { readings: { kind: 'limits' as const, unit: 'g', nominal: 400, lower: 400, upper: 404, count: 30 } };
const study = (o: Partial<ToolStudy>): ToolStudy => ({ id: 's', tool: 'capability', name: 'Weight accuracy 400 g', agreed,
  facts: { readings: THIRTY.map((value, i) => ({ id: `r${i}`, value, at: i })) }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1, ...o });

describe('both ends read the one link', () => {
  it('finds the studies linked to a record, by kind, ref and role, newest first, deleted left out', () => {
    const ss = [
      study({ id: 'a', startedAt: 1, uses: [{ id: 'u1', kind: 'fix', ref: 'f1', role: 'evidence', at: 1 }] }),
      study({ id: 'b', startedAt: 2, uses: [{ id: 'u2', kind: 'fix', ref: 'f1', role: 'proof', at: 2 }] }),
      study({ id: 'c', startedAt: 3, uses: [{ id: 'u3', kind: 'fix', ref: 'f1', role: 'proof', at: 3 }], deletedAt: 4 }),
      study({ id: 'd', startedAt: 4, uses: [{ id: 'u4', kind: 'test', ref: 'f1', role: 'proof', at: 4 }] }),
    ];
    expect(linkedTo(ss, 'fix', 'f1').map(s => s.id)).toEqual(['b', 'a']);
    expect(linkedTo(ss, 'fix', 'f1', 'proof').map(s => s.id)).toEqual(['b']);
    expect(linkedTo(ss, 'test', 'f1').map(s => s.id)).toEqual(['d']);
  });
});

describe('Prove it, and before → after', () => {
  const before = study({ id: 'ev', projectId: 'p1', machine: 'Checkweigher', uses: [{ id: 'u1', kind: 'fix', ref: 'f1', role: 'evidence', at: 1 }] });
  it('starts the same tool on the same scope, empty, as the fix’s proof', () => {
    const p = proveItFrom(before, 'f1', { at: 9, id: 'pr', useId: 'u9', by: 'K. Ahmed' });
    expect(sameScope(p, before)).toBe(true);
    expect([p.projectId, p.machine, p.facts, p.uses[0]]).toEqual(['p1', 'Checkweigher', {}, { id: 'u9', kind: 'fix', ref: 'f1', role: 'proof', at: 9, by: 'K. Ahmed' }]);
    expect(p.agreed).not.toBe(before.agreed);
  });
  it('compares the latest evidence and proof of the same scope — the number moved', () => {
    const after = study({ id: 'pr', startedAt: 5, facts: { readings: THIRTY.map((v, i) => ({ id: `q${i}`, value: Math.round((v + 1) * 10) / 10, at: i })) },
      uses: [{ id: 'u2', kind: 'fix', ref: 'f1', role: 'proof', at: 5 }] });
    const c = beforeAfter([before, after], 'f1');
    expect(c?.text).toMatch(/^mean 401\.2 → 402\.2 g · Cpk 0\.67 → 1\.0\d — just capable now\. The number moved/);
    expect(beforeAfter([before], 'f1')).toBeUndefined();
    expect(beforeAfter([before, { ...after, name: 'Something else' }], 'f1')).toBeUndefined();
  });
  it('too early while the after is short', () => {
    const short = study({ id: 'pr', facts: { readings: [{ id: 'x', value: 402, at: 1 }] }, uses: [{ id: 'u2', kind: 'fix', ref: 'f1', role: 'proof', at: 5 }] });
    expect(beforeAfter([before, short], 'f1')?.text).toMatch(/^Too early/);
  });
});

describe('the other doors', () => {
  it('Take the readings: named for the test, on its machine and job, proving it', () => {
    const s = readingsFor({ id: 't1', projectId: 'p1', title: 'Weight accuracy — 400 g', assetId: 'as1' }, 'Checkweigher', { at: 1, id: 'n', useId: 'u' });
    expect([s.name, s.projectId, s.assetId, s.machine, s.uses[0].kind, s.uses[0].ref, s.uses[0].role]).toEqual(['Weight accuracy — 400 g', 'p1', 'as1', 'Checkweigher', 'test', 't1', 'proof']);
  });
  it('readings owed', () => {
    expect(owedOf(study({ facts: { readings: [{ id: 'a', value: 1, at: 1 }, { id: 'b', value: 2, at: 2, struck: true }] } }))).toBe(29);
    expect(owedOf(study({}))).toBe(0);
  });
  it('Make it better: worth it when it fails or would drift, with the figures in the words', () => {
    expect(worthBetter(study({}))).toBe(true);
    expect(betterWords(study({}))).toBe('Weight accuracy 400 g: Not capable: Cpk 0.67 from 30 — about 2 in 100 would be light.');
    expect(worthBetter(study({ agreed: { readings: { ...agreed.readings, lower: 395, upper: 408 } } }))).toBe(false);
  });
  it('a study’s line carries both sentences, and an overrule beside them', () => {
    expect(studyLine(study({})).text).toBe('30 readings, mean 401.2 g, 400.1–402.6, all within 400.0–404.0 g — Passed. Not capable: Cpk 0.67 from 30 — about 2 in 100 would be light.');
    expect(studyLine(study({ overrule: { verdict: 'Didn’t pass', why: 'the tare was wrong', by: 'K. Ahmed', at: 1 } })).text).toMatch(/Overruled: Didn’t pass by K\. Ahmed — the tare was wrong\.$/);
  });
});
