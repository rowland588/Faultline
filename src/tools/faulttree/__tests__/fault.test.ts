/* FC-152 fault tree analysis — the cut sets, the exact top probability and the importance against scripts/knowledge/cases-t8-3.py (brute force over every state of
 * the basic events, no cut-set algebra), the shared cause, the single point, the refusals and the register's words. */
import { describe, expect, it } from 'vitest';
import { buildTree, cutSets, faultAnalyse, pWords, topProbability, type FaultOut } from '../fault';
import def from '../../scored/defs/fault-tree';
import type { ScoredRow } from '../../../lib/study';
import type { ScoredContext } from '../../scored/types';

const ctx = (inputs: ScoredContext['inputs'] = {}): ScoredContext => ({ today: '2026-11-01', now: 0, inputs, studies: [] });
const out = (rows: ScoredRow[], c = ctx()): FaultOut => { const r = faultAnalyse({ rows, ctx: c }); if ('problems' in r) throw new Error(r.problems.join(' ')); return r; };
const example = def.examples[0].rows;
const row = (id: string, name: string, tree: ScoredRow['tree']): ScoredRow => ({ id, name, tree });
const near = (a: number | undefined, b: number, d = 8) => expect(a).toBeCloseTo(b, d);

describe('the metal-in-a-pack tree — nine cut sets, the second implementation’s figures', () => {
  const o = out(example);
  it('has nine minimal cut sets, six of size 2 and three of size 3, and no single point', () => {
    expect(o.cuts.map(c => c.events.length).sort()).toEqual([2, 2, 2, 2, 2, 2, 3, 3, 3]);
    expect(o.single).toEqual([]);
    expect(o.cuts[0].names).toEqual(['Screen mesh breaks', 'Detector bypassed during a fault']);   /* the likeliest pair first: 0.02 × 0.02 */
  });
  it('P(top) = 0.0012006918 exact; rare-event sum 0.001225; min-cut upper bound 0.0012243877', () => {
    near(o.top, 0.0012006918, 10); near(o.bounds?.rare, 0.001225, 10); near(o.bounds?.upper, 0.0012243877, 10);
    expect(o.result.verdict).toBe(def.examples[0].expect.verdict);
  });
  it('Birnbaum and Fussell–Vesely per event as printed by the second implementation', () => {
    const by = (n: string) => o.importance.find(i => i.name === n);
    near(by('Screen mesh breaks')?.birnbaum, 0.03413297); near(by('Screen mesh breaks')?.fv, 0.577184, 6);
    near(by('Maintenance leaves a part in the line')?.fv, 0.288592, 6); near(by('Reject mechanism fails')?.birnbaum, 0.03378819);
    near(by('Sensitivity drifts')?.birnbaum, 0.00168092); near(by('Hourly test-piece check missed')?.fv, 0.144296, 6);
    expect(['Screen mesh breaks', 'Detector bypassed during a fault']).toContain(o.importance[0].name);
  });
  it('the sentence, tiles and money say it', () => {
    expect(o.result.sentence).toContain('9 minimal cut sets from 7 basic events — the fewest events that can cause it is 2 (no single event does it alone).');
    expect(o.result.sentence).toContain('The probability of the top event is 0.12% (exact for independent events; the rare-event sum is 0.123%, the upper bound 0.122%).');
    expect(o.result.tiles.map(t => [t.k, t.v])).toEqual([['Basic events', '7'], ['Cut sets', '9'], ['Single points', '0'], ['Top event', '0.12%'], ['Weakest link', o.importance[0].name]]);
    expect(o.result.money?.[0]).toContain('Give what one occurrence of the top event costs');
    const priced = out(example, ctx({ eventCost: 250000, period: 'a year' }));
    expect(priced.result.money?.[0]).toContain('At £250,000 an event, 0.12% a year is an expected £300 a year');
  });
});

describe('a cause shared by two branches, and a single point', () => {
  /* top OR( AND(x, b), AND(x, d), e ) with x appearing under both ANDs — cases-t8-3.py: cuts {e}, {x,b}, {x,d}; P 0.0918; FV x 0.479303 */
  const shared = [row('t', 'Top', { gate: 'OR' }), row('g1', 'G1', { parent: 't', gate: 'AND' }), row('x1', 'x', { parent: 'g1', p: 0.1 }), row('b', 'b', { parent: 'g1', p: 0.2 }),
    row('g2', 'G2', { parent: 't', gate: 'AND' }), row('x2', 'x again', { parent: 'g2', same: 'x1' }), row('d', 'd', { parent: 'g2', p: 0.3 }), row('e', 'e', { parent: 't', p: 0.05 })];
  it('counts the shared cause once: 3 cut sets (one single point), P(top) 0.0918, not the independent 0.1', () => {
    const o = out(shared);
    expect(o.cuts.map(c => c.names.join('+'))).toEqual(['e', 'd+x', 'b+x']); expect(o.single).toEqual(['e']);
    near(o.top, 0.0918, 10); near(o.bounds?.rare, 0.1, 10); near(o.bounds?.upper, 0.09693, 10);
    near(o.importance.find(i => i.name === 'x')?.birnbaum, 0.418, 8); near(o.importance.find(i => i.name === 'x')?.fv, 0.479303, 6); near(o.importance.find(i => i.name === 'e')?.fv, 0.544662, 6);
    expect(o.result.verdict).toBe('1 single point'); expect(o.result.tone).toBe('a'); expect(o.result.sentence).toContain('one event alone does it: e');
  });
  it('without the shared mark the same cause is counted as two and the answer is wrong — the reason the mark exists', () => {
    const apart = shared.map(r => (r.id === 'x2' ? { ...r, tree: { parent: 'g2', p: 0.1 } } : r));
    near(out(apart).top, 0.09693, 10); expect(out(apart).top).not.toBeCloseTo(0.0918, 4);   /* 1 − 0.98 × 0.97 × 0.95 */
  });
  it('a single point beside a pair: P 0.06094, the pair carries 98% of it', () => {
    const o = out([row('t', 'Top', { gate: 'OR' }), row('u', 'u', { parent: 't', p: 0.001 }), row('g', 'pair', { parent: 't', gate: 'AND' }), row('v', 'v', { parent: 'g', p: 0.2 }), row('w', 'w', { parent: 'g', p: 0.3 })]);
    near(o.top, 0.06094, 10); near(o.importance.find(i => i.name === 'v')?.fv, 0.984575, 6); near(o.importance.find(i => i.name === 'u')?.fv, 0.016410, 6);
  });
});

describe('the logic', () => {
  it('OR of independent events is 1 − Π(1 − p); AND is Π p; absorption keeps only minimal cut sets', () => {
    const p = new Map([['a', 0.1], ['b', 0.2]]);
    near(topProbability([['a'], ['b']], p), 1 - 0.9 * 0.8, 12); near(topProbability([['a', 'b']], p), 0.02, 12);
    const t = buildTree([row('t', 'T', { gate: 'OR' }), row('a', 'a', { parent: 't', p: 0.1 }), row('g', 'g', { parent: 't', gate: 'AND' }), row('a2', 'a2', { parent: 'g', same: 'a' }), row('b', 'b', { parent: 'g', p: 0.2 })]);
    expect(cutSets(t)).toEqual([['a']]);   /* {a} absorbs {a, b} */
  });
  it('missing probabilities: the cut sets stand, the probability waits, and the page names who lacks one', () => {
    const o = out(example.map(r => (r.id === 'a1' ? { ...r, tree: { parent: 'a' } } : r)));
    expect(o.top).toBeUndefined(); expect(o.cuts.length).toBe(9); expect(o.result.sentence).toContain('Probabilities are missing for Screen mesh breaks');
    expect(o.result.tiles.find(t => t.k === 'Top event')?.v).toBe('—');
  });
  it('refuses what cannot be read: no top, two tops, a loop, nothing under the top', () => {
    const p = (rows: ScoredRow[]) => { const r = faultAnalyse({ rows, ctx: ctx() }); return 'problems' in r ? r.problems.join(' ') : 'ok'; };
    expect(p([row('t', '', {})])).toContain('Name the top event');
    expect(p([row('a', 'A', {}), row('b', 'B', {})])).toContain('2 top events');
    expect(p([row('t', 'T', { gate: 'OR' })])).toContain('Add the causes under the top event');
    expect(p([row('t', 'T', { gate: 'OR' }), row('a', 'A', { parent: 't' }), row('b', 'B', { parent: 't' })])).toBe('ok');   /* basic events with no probability still give cut sets */
    expect(p([row('t', 'T', { parent: 'u' }), row('u', 'U', { parent: 't' }), row('r', 'R', {})])).toMatch(/loops back|top events/);
  });
  it('words a probability as a floor reads it', () => {
    expect([pWords(0.05), pWords(0.0012006918), pWords(0.00003), pWords(0)]).toEqual(['5%', '0.12%', '3.00e-5', '0']);
  });
});
