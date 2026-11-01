/* FC-133 the control plan — the arithmetic against scripts/knowledge/cases-t8-3.py (a second implementation), the six parts, the reading of the FMEA and the check
 * logs beside it, and the register's words. */
import { describe, expect, it } from 'vitest';
import { cplanAnalyse, fromFmea, besideOf, readPlanRow, type CplanOut } from '../cplan';
import def from '../../scored/defs/control-plan';
import fmeaDef from '../../scored/defs/fmea';
import type { ScoredRow, ToolStudy } from '../../../lib/study';
import type { ScoredContext } from '../../scored/types';

const NOW = Date.parse('2026-11-01T10:00:00Z');
const ctx = (over: Partial<ScoredContext> = {}): ScoredContext => ({ today: '2026-11-01', now: NOW, inputs: { rate: 25, speed: 200, packCost: 0.4, shiftMin: 480 }, studies: [], ...over });
const out = (rows: ScoredRow[], c: ScoredContext = ctx()): CplanOut => { const r = cplanAnalyse({ rows, ctx: c }); if ('problems' in r) throw new Error(r.problems.join(' ')); return r; };
const example = def.examples[0].rows;
const study = (over: Partial<ToolStudy>): ToolStudy => ({ id: 's', tool: 'scored', name: 'x', workspaceId: 'L', facts: {}, uses: [], startedAt: NOW, updatedAt: NOW, ...over } as ToolStudy);

describe('the plan’s money — the record’s worked case, by hand and by the second implementation', () => {
  it('every 30 min: 16 checks, £33.33 of labour a shift, 6,000 packs at risk, £2,400 at 40p; every 15 min: 32, £66.67, 3,000', () => {
    const a = readPlanRow({ id: 'a', name: 'Seal', plan: { everyMin: 30, minutes: 5 } }, 1, { fmeas: [], checks: [] }, ctx().inputs);
    expect([a.checksShift, Math.round((a.labourShift as number) * 10000) / 10000, a.atRisk, Math.round(a.atRiskGbp as number)]).toEqual([16, 33.3333, 6000, 2400]);
    const b = readPlanRow({ id: 'b', name: 'Seal', plan: { everyMin: 15, minutes: 5 } }, 1, { fmeas: [], checks: [] }, ctx().inputs);
    expect([b.checksShift, Math.round((b.labourShift as number) * 10000) / 10000, b.atRisk, Math.round(b.atRiskGbp as number)]).toEqual([32, 66.6667, 3000, 1200]);
  });
  it('the example plan: 32 checks a shift, £56.67 of labour, the most at risk 12,000 packs = £4,800; the sentence and money say so', () => {
    const o = out(example);
    expect(o.result.tiles.find(t => t.k === 'Checks a shift')).toMatchObject({ v: '32', of: '£56.67 of labour' });
    expect(o.result.money?.[0]).toContain('£56.67 of labour a shift');
    expect(o.result.money?.[1]).toContain('12,000 packs'); expect(o.result.money?.[1]).toContain('£4,800');
  });
  it('a missing input is named and nothing waits on it', () => {
    const o = out(example, ctx({ inputs: {} }));
    expect(o.result.money?.[0]).toContain('To price the plan give the minutes of a shift, £ an hour for the people checking, the line’s speed (packs a minute), what a pack held is worth');
    expect(o.result.verdict).toBe('1 gap');
    const w = out(example, ctx({ inputs: { rate: 25, shiftMin: 480 } })).result.money?.join(' ') ?? '';
    expect(w).toContain('£56.67'); expect(w).toContain('the line’s speed'); expect(w).not.toContain('the minutes of a shift');
  });
  it('a row without the minutes one check takes is not priced (labour is the other rows’) and says so', () => {
    const rows = example.map(r => (r.id === 'c2' ? { ...r, plan: { ...r.plan, minutes: undefined } } : r));
    expect(out(rows).result.money?.[0]).toContain('£43.33 of labour a shift');
    expect(out(rows).result.money?.join(' ')).toContain('the minutes one check takes');
  });
});

describe('the six parts', () => {
  it('the example: three complete, Net weight with no reaction — "1 gap", the order typed, the sentence names what is unsaid', () => {
    const o = out(example), e = def.examples[0].expect;
    expect(o.result.verdict).toBe(e.verdict); expect(o.ranked.map(r => r.name)).toEqual(e.order);
    expect(o.ranked.filter(r => r.class === 'complete').length).toBe(e.counts?.complete); expect(o.ranked.filter(r => r.class === 'open').length).toBe(e.counts?.open);
    expect(o.result.sentence).toContain('4 characteristics on the plan: 3 complete, 1 with something unsaid.');
    expect(o.result.sentence).toContain('Net weight — still to say: what is done when it is out.');
  });
  it('an event can stand for the interval; a sample may be a number; every other part must be said', () => {
    const r = readPlanRow({ id: 'x', name: 'Date code', plan: { spec: 'order', method: 'visual', n: 1, event: 'at changeover', owner: 'Op', reaction: 'stop' } }, 1, { fmeas: [], checks: [] });
    expect(r.complete).toBe(true); expect(r.eventOnly).toBe(true);
    const e = readPlanRow({ id: 'y', name: 'Empty', plan: {} }, 1, { fmeas: [], checks: [] });
    expect(e.missing).toEqual(['spec', 'method', 'sample', 'often', 'owner', 'reaction']);
  });
  it('nothing named says what to name', () => {
    expect(cplanAnalyse({ rows: [{ id: 'z', name: '  ', plan: {} }], ctx: ctx() })).toEqual({ problems: [expect.stringContaining('Name at least one characteristic')] });
  });
});

describe('reading the FMEA and the check logs beside it', () => {
  const fmea = study({ id: 'F', name: 'Wrapper FMEA', agreed: { scored: { key: 'fmea', rows: fmeaDef.examples[0].rows } } });
  const log = study({ id: 'G', tool: 'log', name: 'Line 7 checks', facts: { results: [] }, agreed: { log: { key: 'first-off', since: NOW - 3 * 3_600_000, checks: [{ id: 'k1', name: 'Seal pull', when: { every: 60, unit: 'min' }, kind: 'passfail', who: 'Tech', reaction: 'Hold' }] } } } as never);
  it('the High and Medium failure modes (and any severity 8 or more) with no row pointing at them are listed; one pointed at is covered', () => {
    const o = out([{ id: 'p', name: 'Seal', plan: { fmea: { studyId: 'F', rowId: 'f1' } } }], ctx({ studies: [fmea], self: { id: 'me', workspaceId: 'L' } }));
    // the FMEA example: High 1 (wrong date code), Medium 4 (seal, reel, metal detector, splice) + Low with S>=8: none → 5 risks, 1 covered
    expect(o.uncovered.length).toBe(4); expect(o.uncovered[0].ap).toBe('H');
    expect(o.result.sentence).toContain('1 of 5 High or Medium failure modes');
    expect(o.result.tiles.find(t => t.k === 'Risks with a check')).toMatchObject({ v: '1', of: 'of 5' });
    expect(o.result.also?.title).toBe('Risks without a check');
  });
  it('a scope is kept: an FMEA of another line is not read', () => {
    const o = out([{ id: 'p', name: 'Seal', plan: {} }], ctx({ studies: [{ ...fmea, workspaceId: 'OTHER' }], self: { id: 'me', workspaceId: 'L' } }));
    expect(o.uncovered.length).toBe(0); expect(o.result.sentence).toContain('No FMEA on this line or project');
  });
  it('From the FMEA starts a card for each risk not yet pointed at, with the step and the detection carried over', () => {
    const b = besideOf(ctx({ studies: [fmea], self: { id: 'me', workspaceId: 'L' } }));
    const starters = fromFmea([], b, (() => { let n = 0; return () => `n${++n}`; })());
    expect(starters.length).toBe(5); expect(starters[0].plan?.fmea).toEqual({ studyId: 'F', rowId: 'f1' });
    expect(fromFmea(starters, b, () => 'q').length).toBe(0);
  });
  it('a linked check log: failed or overdue is red and counted; the interval promised is held against the log’s', () => {
    const b = besideOf(ctx({ studies: [log], self: { id: 'me', workspaceId: 'L' } }));
    expect(b.checks.length).toBe(1); expect(b.checks[0].interval).toBe(60);
    const o = out([{ id: 'p', name: 'Seal', plan: { everyMin: 30, link: { logId: 'G', checkId: 'k1' } } }], ctx({ studies: [log], self: { id: 'me', workspaceId: 'L' } }));
    expect(o.reads[0].linkedState?.key).toBe('overdue'); expect(o.reads[0].mismatch).toEqual({ plan: 30, log: 60 });
    expect(o.result.tone).toBe('r'); expect(o.result.sentence).toContain('0 failed, 1 overdue');
    expect(o.result.sentence).toContain('the plan says every 30 min, its log runs every 60 min');
    // the log's own interval, who and reaction stand in for what the row leaves blank
    expect(readPlanRow({ id: 'q', name: 'Seal', plan: { spec: 's', method: 'm', sample: '1', link: { logId: 'G', checkId: 'k1' } } }, 1, b, {}).complete).toBe(true);
  });
});
