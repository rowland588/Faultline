/* THE FACTORY ACROSS LINES, WITHIN ONE CUSTOMER (docs/LUNAR-KNOWLEDGE.md §6). */
import { describe, it, expect } from 'vitest';
import { acrossLines } from '../factory';
import type { Entry } from '../model';

const f = (id: string, line: string, machine: string, reason: string, lapsed = false): Entry => ({
  id, workspaceId: line, kind: 'finding', known: 'counted', subject: `stops:${machine.toLowerCase()}|${reason.toLowerCase()}`, claim: `recurs:stops:${machine.toLowerCase()}|${reason.toLowerCase()}`,
  says: `${reason} on the ${machine} recurs`, body: lapsed ? { signature: 'lapsed', lapsed: true } : { signature: 'present', machine, reason }, source: 'brain-b2', at: 1, updatedAt: 1,
});
const held = (id: string, line: string, machine: string, reason: string): Entry => ({
  id, workspaceId: line, kind: 'outcome', known: 'counted', subject: `fix:${id}`, claim: `outcome:fix:${id}`, says: '', source: 'outcome-1', at: 2, updatedAt: 2,
  body: { signature: 'held', verdict: 'held', machine, reason, fixTitle: 'New film guide' },
});
const LINES = [
  { id: 'A', name: 'Line 1', clientName: 'Branston' }, { id: 'B', name: 'Line 2', clientName: 'branston ' },
  { id: 'C', name: 'Line 3', clientName: 'Brook Dairy' }, { id: 'D', name: 'Line 4', clientName: 'Brook Dairy' },
];
const kinds: Record<string, string> = { 'A|Bagger 1': 'bagger', 'B|Bagger 2': 'bagger', 'C|Bagger': 'bagger', 'D|Wrapper': 'wrapper' };
const kindOf = (l: string, m: string) => kinds[`${l}|${m}`];

describe('across lines', () => {
  it('the same reason on the same kind of machine on two of one customer’s lines is said once, naming both', () => {
    const out = acrossLines(LINES, [f('a', 'A', 'Bagger 1', 'Jam'), f('b', 'B', 'Bagger 2', 'Jam')], kindOf);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('recurring-together');
    expect(out[0].says).toMatch(/^Jam keeps coming back on the bagger on 2 lines — Line 1 \(Bagger 1\), Line 2 \(Bagger 2\)/);
  });
  it('never joins one customer’s lines to another’s', () => {
    const out = acrossLines(LINES, [f('a', 'A', 'Bagger 1', 'Jam'), f('c', 'C', 'Bagger', 'Jam')], kindOf);
    expect(out).toEqual([]);
  });
  it('a lapsed pattern is not recurring', () => {
    expect(acrossLines(LINES, [f('a', 'A', 'Bagger 1', 'Jam'), f('b', 'B', 'Bagger 2', 'Jam', true)], kindOf)).toEqual([]);
  });
  it('a fix that held on one line is pointed to where the pattern still recurs — as evidence from another line, not proof', () => {
    const out = acrossLines(LINES, [f('a', 'A', 'Bagger 1', 'Jam'), held('h1', 'B', 'Bagger 2', 'Jam')], kindOf, 'A');
    const h = out.find(x => x.kind === 'held-elsewhere')!;
    expect(h.held).toMatchObject({ lineName: 'Line 2', fixTitle: 'New film guide' });
    expect(h.says).toMatch(/on Line 2 the same kind of machine \(bagger\) had “New film guide”, and it held \(counted\)\. Worth trying here — it is evidence from another line, not proof for this one\./);
  });
});
