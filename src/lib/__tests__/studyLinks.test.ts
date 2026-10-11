import { describe, it, expect } from 'vitest';
import { linkedTo, beforeAfter, proveItFrom, readingsFor, owedOf, betterWords, worthBetter, studyLine, sameScope, studyHref, studyTitle, currentBalance, countermeasureFrom, recordHref, provedLine, recordProvedLine, measuredOn, measuredDays } from '../studyLinks';
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

describe('a work balance is evidence like any study (docs/BUILD.md, 3d)', () => {
  const steps = (op1: number) => [
    { id: 'a', order: 0, name: 'Feed the bagger', who: 'Op 1', typedSec: op1 },
    { id: 'b', order: 1, name: 'Fold and tape the case', who: 'Op 2', laps: [8, 8.2, 7.9, 8.1, 8].map((sec, i) => ({ id: `l${i}`, sec, at: i })), rating: 110 },
    { id: 'c', order: 2, name: 'Stack the pallet', who: 'Op 3', typedSec: 7 },
  ];
  const bal = (o: Partial<ToolStudy>): ToolStudy => ({ id: 'w', tool: 'balance', name: 'Maris Piper 2kg', standardId: 'std', workspaceId: 'ws',
    agreed: { balance: { taktSec: 12 } }, facts: { steps: steps(12.9) }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1, ...o });
  it('is called a work balance, said in its own words, the one over takt first', () => {
    expect(studyTitle(bal({}))).toBe('Work balance — Maris Piper 2kg');
    expect(studyLine(bal({})).text).toMatch(/^Op 1 carries 12\.9 s — over takt by 0\.9 s\. 28\.7 s of work at a 12\.0 s takt/);
    expect(studyLine(bal({})).text).not.toMatch(/limits|readings/);
  });
  it('opens on its line standard — the job’s when attached, else the line’s — as itself', () => {
    expect(studyHref(bal({}))).toBe('/w/ws/standards/std?at=balance&view=work&study=w');
    expect(studyHref(bal({ projectId: 'p1' }))).toBe('/project/p1/standard/std?at=balance&view=work&study=w');
    expect(studyHref(study({ id: 'cap' }))).toBe('/capability/cap');
  });
  it('the line standard reads the newest timing of it', () => {
    expect(currentBalance([bal({ id: 'old', startedAt: 1 }), bal({ id: 'new', startedAt: 5 }), bal({ id: 'gone', startedAt: 9, deletedAt: 10 })], 'std')?.id).toBe('new');
  });
  it('Make it better names whoever is over takt and by how much; within takt, nothing to make better', () => {
    expect(worthBetter(bal({}))).toBe(true);
    expect(betterWords(bal({}))).toBe('Maris Piper 2kg: Op 1 carries 12.9 s against a 12.0 s takt — take 0.9 s of work off Op 1, or change how it is done.');
    expect(worthBetter(bal({ facts: { steps: steps(10) } }))).toBe(false);
  });
  it('Prove it times the same elements again: no laps, no pace, typed only where never timed', () => {
    const p = proveItFrom(bal({ projectId: 'p1' }), 'f1', { at: 9, id: 'pr', useId: 'u9' });
    expect([p.tool, p.standardId, p.projectId]).toEqual(['balance', 'std', 'p1']);
    expect(p.facts.steps?.map(s => [s.name, s.laps, s.rating, s.typedSec])).toEqual([
      ['Feed the bagger', undefined, undefined, 12.9], ['Fold and tape the case', undefined, undefined, undefined], ['Stack the pallet', undefined, undefined, 7]]);
    expect(sameScope(p, bal({}))).toBe(true);
    expect(sameScope(p, bal({ standardId: 'other' }))).toBe(false);
    expect(sameScope(p, bal({ agreed: { balance: { taktSec: 10 } } }))).toBe(false);
  });
  it('before → after on the fix, by the longest stack against takt', () => {
    const ev = bal({ id: 'ev', uses: [{ id: 'u1', kind: 'fix', ref: 'f1', role: 'evidence', at: 1 }] });
    const pr = bal({ id: 'pr', startedAt: 5, facts: { steps: steps(9.5) }, uses: [{ id: 'u2', kind: 'fix', ref: 'f1', role: 'proof', at: 5 }] });
    const ba = beforeAfter([ev, pr], 'f1');
    expect(ba?.text).toMatch(/^The longest stack 12\.9 s → 9\.5 s against a 12\.0 s takt · \d+% → \d+% balanced — within takt now\. The number moved/);
    expect(ba?.tone).toBe('g');
  });
});

describe('on a running line (docs/BUILD.md, 2h): the board, not a stage-gate fix', () => {
  it('Make it better is a countermeasure on the board — the study\'s figures its words, what it should change said, on the cause', () => {
    const row = countermeasureFrom(study({ projectId: 'p1' }), { id: 'a1', at: 5, lineId: 'L1', causeRef: 'case:cause', bone: 'measurement' });
    expect(row).toEqual({
      id: 'a1', projectId: 'p1', lineId: 'L1', what: betterWords(study({})), where: '', why: 'Capability study — Weight accuracy 400 g', who: '', when: '', state: 'todo',
      pillar: 'measurement', causeRef: 'case:cause', expect: 'Every reading within the limits, Cpk 1.33 or more, on the same readings again', createdAt: 5, updatedAt: 5,
    });
    const bal = { ...study({}), tool: 'balance' as const, name: 'Maris Piper 2kg', agreed: { balance: { taktSec: 12 } },
      facts: { steps: [{ id: 'a', order: 0, name: 'x', who: 'Op 1', typedSec: 12.9 }] } };
    expect([countermeasureFrom(bal, { id: 'a2', at: 1 }).pillar, countermeasureFrom(bal, { id: 'a2', at: 1 }).expect]).toEqual(['method', 'Op 1 within the 12.0 s takt, timed again']);
  });
  it('each link opens its record: a fix, a board action, a cause on its fishbone', () => {
    expect(recordHref('p1', { kind: 'fix', ref: 'f1' })).toBe('/project/p1/fixes?open=f1');
    expect(recordHref('p1', { kind: 'action', ref: 'a1' })).toBe('/project/p1/board?a=a1');
    expect(recordHref('p1', { kind: 'cause', ref: 'case1:c1' })).toBe('/project/p1/fishbone?problem=case1&cause=c1');
    expect(recordHref('p1', { kind: 'test', ref: 't1' })).toBe('/project/p1/testing?open=t1');
  });
  it('a board action carries the same line a fix does: before → after, else what proved it, else how we know', () => {
    const ev = study({ id: 'ev', uses: [{ id: 'u1', kind: 'action', ref: 'a1', role: 'evidence', at: 1 }] });
    expect(provedLine([ev], 'a1', 'action')).toMatch(/^How we know: 30 readings/);
    expect(provedLine([ev], 'a1')).toBeUndefined();
    const pr = study({ id: 'pr', startedAt: 5, facts: { readings: THIRTY.map((v, i) => ({ id: `r${i}`, value: Math.round((v + 1) * 10) / 10, at: i })) },
      uses: [{ id: 'u2', kind: 'action', ref: 'a1', role: 'proof', at: 5 }] });
    expect(provedLine([ev, pr], 'a1', 'action')).toMatch(/^Before → after: .*The number moved/);
  });
});

describe('the paper carries what proved it (docs/BUILD.md, 2i)', () => {
  it('a test: its proof, named; a fix: its line; nothing when no study is linked', () => {
    const pr = study({ id: 'p', machine: 'Checkweigher', uses: [{ id: 'u', kind: 'test', ref: 't1', role: 'proof', at: 1 }] });
    expect(recordProvedLine([pr], { id: 't1' })).toBe(`Proved by: Capability study — Weight accuracy 400 g · Checkweigher — ${studyLine(pr).text}`);
    const ev = study({ id: 'e', uses: [{ id: 'u', kind: 'fix', ref: 'f1', role: 'evidence', at: 1 }] });
    expect(recordProvedLine([ev], { id: 'f1', kind: 'fix' })).toMatch(/^How we know: /);
    expect(recordProvedLine([ev], { id: 't9' })).toBeUndefined();
  });
});

describe('what was measured on a day (docs/BUILD.md, 2j)', () => {
  const day = (ms: number) => (ms < 100 ? '2026-10-10' : '2026-10-11');
  it('the readings taken that day, by whom, and what the study says now', () => {
    const s = study({ facts: { readings: THIRTY.map((value, i) => ({ id: `r${i}`, value, at: i < 10 ? 50 : 200, ...(i < 10 ? { who: 'K. Ahmed' } : {}) })) } });
    expect(measuredOn(s, '2026-10-10', day)?.text).toBe(`Capability study — Weight accuracy 400 g: 10 readings taken by K. Ahmed — ${studyLine(s).text}`);
    expect(measuredOn(s, '2026-10-11', day)?.text).toMatch(/: 20 readings taken — /);
    expect(measuredOn(s, '2026-10-12', day)).toBeUndefined();
    expect(measuredDays(s, day).sort()).toEqual(['2026-10-10', '2026-10-11']);
  });
  it('a work balance counts its laps, an interruption and a struck lap for nothing', () => {
    const s = { ...study({}), tool: 'balance' as const, name: 'Maris Piper 2kg', agreed: { balance: { taktSec: 12 } },
      facts: { steps: [{ id: 'a', order: 0, name: 'x', who: 'Op 1', laps: [{ id: 'l1', sec: 6, at: 50 }, { id: 'l2', sec: 9, at: 50, foreign: true }, { id: 'l3', sec: 1, at: 50, struck: true }] }] } };
    expect(measuredOn(s, '2026-10-10', day)?.text).toMatch(/^Work balance — Maris Piper 2kg: 1 lap timed — /);
  });
});
