import { describe, it, expect } from 'vitest';
import { linkedTo, beforeAfter, proveItFrom, readingsFor, owedOf, betterWords, worthBetter, studyLine, sameScope, studyHref, studyTitle, currentBalance, countermeasureFrom, recordHref, provedLine, recordProvedLine, measuredOn, measuredDays, squareWord, linkOf, currentMap, flowLine, currentChangeover, changeoverLine, betterExpect, compareChangeoverStep } from '../studyLinks';
import { carryFlow } from '../ie/steps';
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

describe('a test\'s square on the Commission board (docs/BUILD.md, 2k)', () => {
  const proving = (o: Partial<ToolStudy>) => study({ uses: [{ id: 'u', kind: 'test', ref: 't1', role: 'proof', at: 1 }], ...o });
  it('Cpk once there are enough readings — amber when not capable; else how many are in', () => {
    expect(squareWord([proving({})], 't1')).toEqual({ text: 'Cpk 0.67', tone: 'a' });
    expect(squareWord([proving({ facts: { readings: THIRTY.slice(0, 12).map((value, i) => ({ id: `r${i}`, value, at: i })) } })], 't1')).toEqual({ text: '12 of 30 readings', tone: 'n' });
    expect(squareWord([proving({ facts: { readings: THIRTY.map((v, i) => ({ id: `r${i}`, value: Math.round((v + 1) * 10) / 10, at: i })) } })], 't1')).toEqual({ text: 'Cpk 1.00', tone: 'n' });
    expect(squareWord([proving({})], 't2')).toBeUndefined();
  });
  it('a reading outside the limits is a failure, said in red', () => {
    const w = squareWord([proving({ facts: { readings: [...THIRTY.slice(1), 399.2].map((value, i) => ({ id: `r${i}`, value, at: i })) } })], 't1');
    expect(w?.tone).toBe('r');
  });
});

describe('the value stream map inside a change (docs/BUILD.md, B3)', () => {
  const H = 3600;
  const flow = (qaWait: number) => [
    { id: 'p', order: 0, name: 'Release the run to the line', who: ['Planning'], where: 'Office', kind: 'operation' as const, value: 'needed' as const, cycleSec: 600, batch: 9600, waitSec: 24 * H },
    { id: 'b', order: 1, name: 'Bag and seal', who: ['Machine'], where: 'Bagger', kind: 'operation' as const, value: 'adds' as const, cycleSec: 1.2 },
    { id: 'f', order: 2, name: 'Walk to fetch flat cases', who: ['Op 2'], where: 'Stores', kind: 'move' as const, value: 'waste' as const, cycleSec: 60, batch: 120 },
    { id: 'q', order: 3, name: 'Pallet waits for QA release', who: ['Quality'], where: 'Palletiser', kind: 'wait' as const, waitSec: qaWait },
  ];
  const map = (o: Partial<ToolStudy>): ToolStudy => ({ id: 'm', tool: 'map', name: 'Run released to pallet away', workspaceId: 'ws', projectId: 'job',
    agreed: { map: { scope: 'line' } }, facts: { flow: flow(6 * H) }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1, ...o });

  it('Make it better comes from a step, never the whole map — its words the step\'s own figures', () => {
    expect(worthBetter(map({}))).toBe(false);
    expect(betterWords(map({}), 'q')).toBe('Pallet waits for QA release (Palletiser) — 6.0 h wait');
    expect(betterWords(map({}), 'f')).toBe('Walk to fetch flat cases (Stores) — 1 min of waste each time (for 120)');
  });
  it('a countermeasure from a step: on the bone of whose work it is, where it is, what it should change', () => {
    const row = countermeasureFrom(map({}), { id: 'cm', at: 5, step: 'q' });
    expect([row.what, row.where, row.pillar]).toEqual(['Pallet waits for QA release (Palletiser) — 6.0 h wait', 'Palletiser', 'measurement']);
    expect(row.expect).toBe('Pallet waits for QA release: 6.0 h wait — shorter or gone, walked again on the same map');
    expect(countermeasureFrom(map({}), { id: 'cm', at: 5, step: 'p' }).pillar).toBe('method');
    expect(countermeasureFrom(map({ facts: { flow: [{ ...flow(0)[2], who: ['Stores', 'Forklift driver'] }] } }), { id: 'cm', at: 5, step: 'f' }).pillar).toBe('material');
  });
  it('Prove it walks the same line again: the same steps, each carried until walked or typed again', () => {
    const p = proveItFrom(map({}), 'fx', { at: 9, id: 'm2', useId: 'u2' });
    expect([p.tool, p.name, p.workspaceId, p.uses[0].role]).toEqual(['map', 'Run released to pallet away', 'ws', 'proof']);
    expect((p.facts.flow ?? []).map(x => [x.id, x.source, x.waitSec ?? x.cycleSec])).toEqual([['p', 'carried', 24 * H], ['b', 'carried', 1.2], ['f', 'carried', 60], ['q', 'carried', 6 * H]]);
    expect(sameScope(map({}), p)).toBe(true);
    expect(sameScope(map({}), { ...p, workspaceId: 'other' })).toBe(false);
  });
  it('before → after: the step the fix came from first, then the lead time; nothing claimed while it is carried', () => {
    const ev = map({ uses: [{ id: 'u1', kind: 'fix', ref: 'fx', role: 'evidence', at: 1, step: 'q' }] });
    const carried = proveItFrom(ev, 'fx', { at: 9, id: 'm2', useId: 'u2' });
    const early = beforeAfter([ev, carried], 'fx');
    expect(early?.tone).toBe('n');
    expect(early?.text).toBe('Pallet waits for QA release: not walked again yet. Lead time 1.3 d, no change. 4 of 4 steps carried from before, not walked again yet.');
    const walked = { ...carried, facts: { flow: (carried.facts.flow ?? []).map(x => (x.id === 'q' ? { ...x, waitSec: 1 * H, source: 'typed' as const } : x)) } };
    const ba = beforeAfter([ev, walked], 'fx');
    expect(ba?.tone).toBe('g');
    expect(ba?.text).toBe('Pallet waits for QA release: wait 6.0 h → 1.0 h. Lead time 1.3 d → 1.0 d (−5.0 h). 3 of 4 steps carried from before, not walked again yet.');
    const gone = { ...carried, facts: { flow: (carried.facts.flow ?? []).filter(x => x.id !== 'q').map(x => ({ ...x, source: 'timed' as const })) } };
    expect(beforeAfter([ev, gone], 'fx')?.text).toBe('Pallet waits for QA release: taken out. Lead time 1.3 d → 1.0 d (−6.0 h) · 4 → 3 steps.');
    expect(provedLine([ev, walked], 'fx')).toMatch(/^Before → after: Pallet waits for QA release: wait 6\.0 h → 1\.0 h/);
  });
  it('the line\'s flow on its card: the newest map, lead time and share, what is carried said', () => {
    const later = map({ id: 'm2', startedAt: 5, facts: { flow: carryFlow(flow(1 * H)) } });
    expect(currentMap([map({}), later, map({ id: 'x', workspaceId: 'other', startedAt: 9 })], 'ws')?.id).toBe('m2');
    expect(flowLine(map({}))).toBe('lead time 1.3 d · 0.001% adds value');
    expect(flowLine(later)).toBe('lead time 1.0 d · 0.001% adds value · 4 of 4 steps not walked again yet');
    expect(flowLine(map({ facts: {} }))).toBeUndefined();
  });
  it('a step\'s link keeps which step it came from', () => {
    expect(linkOf('fix', 'fx', 'evidence', 1, 'R', 'u', 'q')).toEqual({ id: 'u', kind: 'fix', ref: 'fx', role: 'evidence', at: 1, by: 'R', step: 'q' });
    expect(linkOf('fix', 'fx', 'evidence', 1, undefined, 'u')).toEqual({ id: 'u', kind: 'fix', ref: 'fx', role: 'evidence', at: 1 });
  });
});

describe('SMED inside a change (docs/TOOLKIT.md, tool 6 — stored as changeover)', () => {
  const M = 60;
  const seq = () => [
    { id: 'clr', order: 0, name: 'Stop and clear the former', sec: 4 * M, side: 'internal' as const, source: 'timed' as const, at: 50, who: 'K. Ahmed', crew: ['Op 1'] },
    { id: 'fet', order: 1, name: 'Fetch the next former from the store', sec: 5 * M, side: 'external' as const, source: 'timed' as const, at: 50, who: 'K. Ahmed', crew: ['Op 1'] },
    { id: 'tub', order: 2, name: 'Change the former tube', sec: 10 * M, side: 'internal' as const, source: 'timed' as const, at: 200, crew: ['Fitter'], where: 'Former',
      plan: { kind: 'streamline' as const, how: 'clamps' as const, targetSec: 4 * M } },
    { id: 'jaw', order: 3, name: 'Pre-heat the sealing jaws before the line stops', sec: 6 * M, side: 'internal' as const, source: 'typed' as const, where: 'Jaws',
      plan: { kind: 'convert' as const, how: 'prepare' as const } },
    { id: 'pre', order: 4, name: 'Pre-stage the film reels', sec: 7 * M, side: 'external' as const, source: 'typed' as const },
  ];
  const co = (o: Partial<ToolStudy>): ToolStudy => ({ id: 'c', tool: 'changeover', name: 'Finest Red 2kg → Express 1.25 kg', product: 'Express 1.25 kg', workspaceId: 'ws', projectId: 'job', standardId: 'std',
    facts: { fromProduct: 'Finest Red 2kg', toProduct: 'Express 1.25 kg', sequence: seq(), running: { shiftsPerDay: 1, hoursPerShift: 5, daysPerWeek: 7 }, changeovers: { count: 1, per: 'shift' },
      products: [{ id: 'p1', product: 'Finest Red 2kg', demandPerDay: 7200, ratePerMin: 60 }, { id: 'p2', product: 'Express 1.25 kg', runMinPerDay: 60 }] },
    uses: [], startedAt: 1, createdAt: 1, updatedAt: 1, ...o });

  it('is called SMED, opens at /smed, and says its minutes, its ladder and its interval', () => {
    expect(studyTitle(co({}))).toBe('SMED — Finest Red 2kg → Express 1.25 kg');
    expect(studyHref(co({}))).toBe('/smed/c');
    /* now 32; separated 20; converted 14; streamlined 8 — 7 changeovers a week; 300 min a day, 180 run, 120 free */
    expect(studyLine(co({})).text).toBe('32 min now. With the 12 min of external work done while the line runs: 20 min — 84 min a week back, 7 changeovers. 32 min now → 20 min separated → 14 min converted → 8 min streamlined, planned — proved when it is timed again. Single-digit minutes — SMED\'s target. Two products at 32 min run every 0.5 days; at 20 min, every 0.3 — daily.');
    expect(studyLine(co({})).tone).toBe('a');
    expect(studyLine(co({ facts: { sequence: [] } })).text).toMatch(/^Record the changeover element by element/);
  });
  it('Make it better comes from an element — its words the SMED action; the whole changeover is never "made better" at once', () => {
    expect(worthBetter(co({}))).toBe(false);
    expect(betterWords(co({}), 'jaw')).toBe('Pre-heat the sealing jaws before the line stops — convert to external (prepare in advance), 6 min');
    expect(betterWords(co({}), 'tub')).toBe('Change the former tube — streamline (quick-release clamps), 10 min → 4 min');
    expect(betterWords(co({}), 'pre')).toBe('Pre-stage the film reels — do it while the line runs (external), 7 min');
    expect(betterWords(co({}), 'clr')).toBe('Stop and clear the former — internal, 4 min');
    expect(betterExpect(co({}), 'jaw')).toBe('Pre-heat the sealing jaws before the line stops: prepared before the line stops — the changeover timed again without it inside');
    expect(betterExpect(co({}), 'tub')).toBe('Change the former tube: 4 min or less inside the stop — the changeover timed again');
    expect(betterExpect(co({}), 'pre')).toBe('Pre-stage the film reels: done while the line runs — the changeover timed again without it inside');
  });
  it('a countermeasure from an element: on the bone of what is to be done — organising is Method, changing the machine Machine — and where it is', () => {
    const jaw = countermeasureFrom(co({}), { id: 'cm', at: 5, step: 'jaw' });
    expect([jaw.what, jaw.pillar, jaw.where, jaw.why, jaw.expect]).toEqual([betterWords(co({}), 'jaw'), 'method', 'Jaws', 'SMED — Finest Red 2kg → Express 1.25 kg', betterExpect(co({}), 'jaw')]);
    expect(countermeasureFrom(co({}), { id: 'cm', at: 5, step: 'tub' }).pillar).toBe('machine');
    expect(countermeasureFrom(co({}), { id: 'cm', at: 5, step: 'pre' }).pillar).toBe('method');
    expect(countermeasureFrom(co({}), { id: 'cm', at: 5, step: 'clr' }).pillar).toBe('machine');
  });
  it('Prove it times the same changeover again: the same elements carried, the plan left on the evidence; the running pattern kept', () => {
    const p = proveItFrom(co({}), 'fx', { at: 9, id: 'c2', useId: 'u2' });
    expect([p.tool, p.name, p.workspaceId, p.standardId, p.product, p.uses[0].role]).toEqual(['changeover', 'Finest Red 2kg → Express 1.25 kg', 'ws', 'std', 'Express 1.25 kg', 'proof']);
    expect((p.facts.sequence ?? []).map(x => [x.id, x.source, x.sec, x.at, x.plan])).toEqual(seq().map(x => [x.id, 'carried', x.sec, undefined, undefined]));
    expect([p.facts.running, p.facts.changeovers, p.facts.products?.length, p.facts.fromProduct]).toEqual([co({}).facts.running, { count: 1, per: 'shift' }, 2, 'Finest Red 2kg']);
    expect(sameScope(co({}), p)).toBe(true);
    expect(sameScope(co({}), { ...p, workspaceId: 'other' })).toBe(false);
    expect(sameScope(co({}), { ...p, name: 'Express 1.25 kg → Finest Red 2kg' })).toBe(false);
  });
  it('before → after: the element the fix came from first, then the minutes against the plan; nothing claimed while carried', () => {
    const ev = co({ uses: [{ id: 'u1', kind: 'fix', ref: 'fx', role: 'evidence', at: 1, step: 'jaw' }] });
    const carried = proveItFrom(ev, 'fx', { at: 9, id: 'c2', useId: 'u2' });
    const early = beforeAfter([ev, carried], 'fx');
    expect(early?.tone).toBe('n');
    expect(early?.text).toBe('Pre-heat the sealing jaws before the line stops: not timed again yet. 32 min → 32 min so far — 5 of 5 elements carried from before, not timed again yet.');
    /* timed again with the jaws pre-heated outside: the element gone from the stop */
    const timed = { ...carried, facts: { ...carried.facts, sequence: (carried.facts.sequence ?? []).filter(x => x.id !== 'jaw').map(x => ({ ...x, source: 'timed' as const })) } };
    const ba = beforeAfter([ev, timed], 'fx');
    expect(ba?.tone).toBe('g');
    expect(ba?.text).toBe('Pre-heat the sealing jaws before the line stops: taken out of the changeover. 32 min → 26 min (−6 min); 42 min a week back at 7 changeovers. The number moved; what moved it is the fix\'s to say. 12 min of external work is still done with the line stopped. The plan was 8 min streamlined — 18 min still to go.');
    expect(provedLine([ev, timed], 'fx')).toMatch(/^Before → after: Pre-heat the sealing jaws before the line stops: taken out/);
    expect(compareChangeoverStep(seq()[4], { ...seq()[4], sec: 3 * M, source: 'timed' })).toBe('Pre-stage the film reels: 7 min → 3 min');
    expect(compareChangeoverStep(seq()[4], { ...seq()[4], side: 'internal', source: 'timed' })).toBe('Pre-stage the film reels: internal now — the line stopped for it');
    expect(compareChangeoverStep(seq()[0], { ...seq()[0], side: 'external', sec: 2 * M, source: 'timed' })).toBe('Stop and clear the former: external now — done while the line runs, 4 min → 2 min');
  });
  it('the line\'s and the standard\'s SMED: the newest; one line for the card, the plan said', () => {
    const later = co({ id: 'c2', startedAt: 5 });
    expect(currentChangeover([co({}), later, co({ id: 'x', workspaceId: 'other', startedAt: 9 })], { workspaceId: 'ws' })?.id).toBe('c2');
    expect(currentChangeover([co({}), co({ id: 'y', standardId: 'other', startedAt: 9 })], { standardId: 'std' })?.id).toBe('c');
    expect(changeoverLine(co({}))).toEqual({ text: 'Finest Red 2kg → Express 1.25 kg: 32 min, 12 min external inside · plan 8 min · every product every 0.5 days', tone: 'a' });
    expect(changeoverLine(co({ facts: { sequence: [] } }))).toBeUndefined();
  });
  it('what was timed on a day: the elements timed, by whom', () => {
    const day = (ms: number) => (ms < 100 ? '2026-10-10' : '2026-10-11');
    expect(measuredOn(co({}), '2026-10-10', day)?.text).toMatch(/^SMED — Finest Red 2kg → Express 1\.25 kg: 2 elements timed by K\. Ahmed — 32 min now/);
    expect(measuredOn(co({}), '2026-10-11', day)?.text).toMatch(/: 1 element timed — /);
    expect(measuredDays(co({}), day).sort()).toEqual(['2026-10-10', '2026-10-11']);
  });
});
