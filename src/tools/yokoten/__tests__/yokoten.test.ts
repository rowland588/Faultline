/* FC-155 — the independent case is knowledge/methods/rca/horizontal-deployment.md, "Worked case": a splice guide proved on
   Line 3, the same wrapper on Lines 1, 4 and 7; offered to all three; taken on Line 1; proved on none; the lines' own break
   rates (Line 7 six, Line 1 four, Line 4 two) rank the offers 7, 1, 4. Worked by hand, not by the module. */
import { describe, expect, it } from 'vitest';
import type { Snag } from '../../../snag/types';
import type { PaceTodoRow } from '../../../db/rows';
import {
  DAY, declineChange, fixSays, offerId, offerSnag, ownRate, proveChange, provedFixes, stateOf, tallyOf, tallySays, takeChange, candidatesOf,
  type FactoryLine, type ProvedFix,
} from '../yokoten';

const REF = 1_800_000_000_000;
const L = (n: number, machines: string[] = ['Wrapper'], o: Partial<FactoryLine> = {}): FactoryLine => ({ id: `w${n}`, name: `Line ${n}`, machines, ...o });
const LINES = [L(1), L(3), L(4), L(7), L(9, ['Filler']), L(2, ['wrapper '], { archived: true })];
const FIX: ProvedFix = { id: 'fx', what: 'Splice guide', machine: 'Wrapper', lineId: 'w3', lineName: 'Line 3', proof: 'Before → after: film breaks 8.0 → 3.0 a shift' };
const breaks = (n: number, line: string, ago = DAY): Snag[] => Array.from({ length: n }, (_, i) =>
  ({ id: `${line}-${i}`, workspaceId: line, problem: 'Film break', status: 'closed', raisedAt: REF - ago - i, updatedAt: REF, targetAsset: 'wrapper' } as Snag));
const BREAKS = [...breaks(6, 'w7'), ...breaks(4, 'w1'), ...breaks(2, 'w4'), ...breaks(5, 'w9')];

describe('the record’s worked case', () => {
  it('the candidates are Lines 1, 4 and 7 — the same wrapper, not Line 3 itself, not an archived line, not another machine', () => {
    expect(candidatesOf(FIX, LINES, [], REF).map(c => c.line.name).sort()).toEqual(['Line 1', 'Line 4', 'Line 7']);
  });
  it('ranks 7, 1, 4 by their own break rate (6, 4, 2)', () => {
    const c = candidatesOf(FIX, LINES, BREAKS, REF);
    expect(c.map(x => [x.line.name, x.rate])).toEqual([['Line 7', 6], ['Line 1', 4], ['Line 4', 2]]);
  });
  it('offered to all three, taken on Line 1, proved on none: the words and the tally', () => {
    const offers = LINES.slice(0, 4).filter(l => l.id !== 'w3').map(l => offerSnag(FIX, l, REF, '1 Nov'));
    const taken = offers.map(o => o.workspaceId === 'w1' ? { ...o, ...takeChange(REF) } : o);
    const c = candidatesOf(FIX, LINES, [...BREAKS, ...taken], REF);
    expect(c.map(x => x.state)).toEqual(['offered', 'taken', 'offered']);
    expect(fixSays(FIX, c)).toBe('Splice guide proved on Line 3 (Before → after: film breaks 8.0 → 3.0 a shift) — Line 7, Line 1 and Line 4 have the Wrapper: taken on Line 1; offered on Line 7 and Line 4.');
    const t = tallyOf(c);
    expect(t).toMatchObject({ lines: 3, taken: 1, offered: 2, proved: 0, declined: 0, notOffered: 0, open: 2 });
    expect(tallySays(t)).toContain('3 lines with this machine · 0 proved · 1 taken · 2 offered, not answered');
  });
});

describe('states and answers', () => {
  const o = offerSnag(FIX, L(7), REF, '1 Nov');
  it('an offer is one row with a fixed id, open', () => {
    expect(o.id).toBe(offerId('fx', 'w7')); expect(o.workspaceId).toBe('w7'); expect(o.targetAsset).toBe('Wrapper'); expect(stateOf(o)).toBe('offered');
  });
  it('taken, proved and declined are told apart, a deleted offer is not offered', () => {
    expect(stateOf({ ...o, ...takeChange(REF) })).toBe('taken');
    expect(stateOf({ ...o, ...proveChange('breaks 7 → 3 a shift', REF) })).toBe('proved');
    expect(stateOf({ ...o, ...declineChange('different film', REF) })).toBe('declined');
    expect(stateOf({ ...o, deletedAt: REF })).toBe('not-offered');
    expect(stateOf(undefined)).toBe('not-offered');
  });
  it('a decline with a reason is complete, an unanswered offer is open', () => {
    const c = candidatesOf(FIX, LINES, [{ ...o, ...declineChange('x', REF) }], REF);
    expect(tallyOf(c).open).toBe(2);
  });
  it('the own rate counts the window only, and never an offer itself', () => {
    expect(ownRate({ id: 'w7' }, 'Wrapper', [...breaks(2, 'w7'), ...breaks(3, 'w7', 100 * DAY), o], REF)).toBe(2);
  });
});

describe('what is proved', () => {
  const todo = (o: Partial<PaceTodoRow> = {}): PaceTodoRow => ({ id: 'a1', what: 'Splice guide', where: 'Wrapper', why: '', who: '', when: '', state: 'done', lineId: 'p3', createdAt: 0, updatedAt: 0, ...o } as PaceTodoRow);
  const plines = [{ id: 'p3', workspaceId: 'w3' }];
  it('nothing without a before → after; a fix on the whole line or not done is not offered', () => {
    expect(provedFixes([todo()], plines, [], LINES)).toEqual([]);
    expect(provedFixes([todo({ where: 'Whole line' })], plines, [], LINES)).toEqual([]);
    expect(provedFixes([todo({ state: 'todo' })], plines, [], LINES)).toEqual([]);
    expect(provedFixes([todo({ lineId: 'nope' })], plines, [], LINES)).toEqual([]);
  });
});
