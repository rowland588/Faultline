/* FC-155 — the independent case is knowledge/methods/rca/horizontal-deployment.md, "Worked case": a splice guide proved on
   Line 3, the same wrapper on Lines 1, 4 and 7; offered to all three; taken on Line 1; proved on none; the lines' own break
   rates (Line 7 six, Line 1 four, Line 4 two) rank the offers 7, 1, 4. Worked by hand, not by the module. */
import { describe, expect, it } from 'vitest';
import type { Snag } from '../../../snag/types';
import type { PaceTodoRow } from '../../../db/rows';
import {
  DAY, declineChange, fixSays, offerId, offerSnag, ownRate, proveChange, provedFixes, stateOf, tallyOf, tallySays, takeChange, candidatesOf,
  fixMoneyOf, fixMoneySays, lineIfOf, lineIfSays, projectSpreadSays, spreadIfOf, spreadIfSays,
  type FactoryLine, type LineIf, type ProvedFix,
} from '../yokoten';
import { problemMoney } from '../../../lib/sixmMoney';

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

/* THE MONEY — knowledge/specs/FC-155-horizontal-deployment.md §6 "In money", cases 1–7; the figures are scripts/knowledge/cases-rca.py's
   ("Horizontal deployment in money"), worked there in plain arithmetic, not by this module. The source line is FC-146's own case. */
describe('in money', () => {
  const LINE3 = { crew: 5, labourRatePerHour: 14.8, labourBurden: 1.3, packsPerMin: 60, marginPerPack: 0.06 };
  const LINE7 = { crew: 4, labourRatePerHour: 12.5, labourBurden: 1.25, packsPerMin: 80, marginPerPack: 0.05 };
  const LINE1 = { crew: 3, labourRatePerHour: 13, labourBurden: 1.2, packsPerMin: 70, marginPerPack: 0.04 };
  const LINE4 = { packsPerMin: 50, marginPerPack: 0.06 };
  const SEALER = { names: ['Sealer'] };   // Line 1's Line capacity: Sealer 50 a minute against the Wrapper's 100
  const measure = (before?: number, unit = 'h a week') => ({ label: 'Lost time on Line 3', unit, better: 'lower' as const, ...(before != null ? { before, now: 0 } : {}) });
  const money3 = problemMoney(measure(3), { whole: true }, LINE3, undefined);
  const worth = fixMoneyOf(40, measure(3), money3, { onProblem: true });
  const ifs = new Map<string, LineIf>([['w7', lineIfOf(1.2, 'Wrapper', LINE7, undefined)], ['w1', lineIfOf(1.2, 'Wrapper', LINE1, SEALER)], ['w4', lineIfOf(1.2, 'Wrapper', LINE4, undefined)]]);
  const cands = candidatesOf(FIX, LINES, BREAKS, REF);   // Line 7, Line 1, Line 4 — none offered yet

  it('1 — where it was proved: the board’s 40% of 3 h a week = 1.2 h, £115.44 labour · 4,320 packs · £259.20 contribution, said as the board’s share', () => {
    expect(worth.kind).toBe('worth');
    if (worth.kind !== 'worth') return;
    expect(worth.hours).toBeCloseTo(1.2, 9);
    expect(worth.here.labour).toBeCloseTo(115.44, 6); expect(worth.here.packs).toBeCloseTo(4320, 6); expect(worth.here.contribution).toBeCloseTo(259.2, 6);
    expect(fixMoneySays(FIX, worth)).toBe('What it is worth on Line 3, by the share its 6M board gives it — 40% of the problem’s 3 h a week, so 1.2 h a week: £115 labour · 4,320 packs · £259 contribution a week.');
    expect(fixMoneySays(FIX, worth)).not.toMatch(/earned|saved|measured/);
  });
  it('2–4 — each line’s if by its own cost model and bottleneck: Line 7 counted as stopping, Line 1 labour only, Line 4 its wage asked for', () => {
    const v7 = ifs.get('w7')!, v1 = ifs.get('w1')!, v4 = ifs.get('w4')!;
    expect(v7.labour).toBeCloseTo(75, 6); expect(v7.packs).toBeCloseTo(5760, 6); expect(v7.contribution).toBeCloseTo(288, 6);
    expect(v1.labour).toBeCloseTo(56.16, 6); expect(v1.packs).toBe(0); expect(v1.contribution).toBe(0); expect(v1.stopsLine).toBe(false);
    expect(v4.labour).toBeUndefined(); expect(v4.packs).toBeCloseTo(3600, 6); expect(v4.contribution).toBeCloseTo(216, 6);
    expect(lineIfSays('Line 7', 'Wrapper', v7, 'there')).toBe('If the same 1.2 h a week comes back there: £75 labour · 5,760 packs · £288 contribution a week — counted as stopping the line: Line 7’s bottleneck is not known until its capacity is counted.');
    expect(lineIfSays('Line 1', 'Wrapper', v1, 'there')).toBe('If the same 1.2 h a week comes back there: £56 labour a week — the Wrapper is not Line 1’s bottleneck, so the line runs round it.');
    expect(lineIfSays('Line 4', 'Wrapper', v4, 'here')).toBe('If the same 1.2 h a week comes back here: 3,600 packs · £216 contribution a week — counted as stopping the line: Line 4’s bottleneck is not known until its capacity is counted; give Line 4 a wage (Set up the line) to say the labour.');
    expect(lineIfSays('Line 7', 'Wrapper', lineIfOf(1.2, 'Wrapper', LINE7, { names: ['wrapper'] }), 'there')).toBe('If the same 1.2 h a week comes back there: £75 labour · 5,760 packs · £288 contribution a week — the Wrapper is Line 7’s bottleneck.');
  });
  it('5 — the three not yet answered: 9,360 packs · £504, the labour not added up and Line 4 named; the packs’ assumption said', () => {
    const s = spreadIfOf(cands, ifs)!;
    expect(s.lines).toEqual(['Line 7', 'Line 1', 'Line 4']);
    expect(s.labour).toBeUndefined(); expect(s.packs).toBeCloseTo(9360, 6); expect(s.contribution).toBeCloseTo(504, 6);
    expect(s.noWage).toEqual(['Line 4']); expect(s.countedAsStop).toEqual(['Line 7', 'Line 4']);
    if (worth.kind !== 'worth') throw new Error('worth');
    expect(spreadIfSays(worth, cands, ifs)).toBe('If it brings back the same 1.2 h a week on the 3 lines not yet answered: 9,360 packs · £504 contribution a week — an if, not earned: each line proves it by its own before → after. The labour is not added up — Line 4 has no wage (Set up the line). The packs are counted as stopping the line on Line 7 and Line 4, whose bottleneck is not known.');
  });
  it('6 — Line 1 proved it and Line 4 declined: the sum is Line 7 alone, £75 · 5,760 packs · £288; a wage typed on Line 4 adds the labour', () => {
    const answered = [offerSnag(FIX, L(7), REF, '1 Nov'), { ...offerSnag(FIX, L(1), REF, '1 Nov'), ...proveChange('breaks 4 → 1', REF) }, { ...offerSnag(FIX, L(4), REF, '1 Nov'), ...declineChange('different film', REF) }];
    const c = candidatesOf(FIX, LINES, [...BREAKS, ...answered], REF);
    if (worth.kind !== 'worth') throw new Error('worth');
    expect(spreadIfSays(worth, c, ifs)).toBe('If it brings back the same 1.2 h a week on Line 7, the line not yet answered: £75 labour · 5,760 packs · £288 contribution a week — an if, not earned: each line proves it by its own before → after. The packs are counted as stopping the line on Line 7, whose bottleneck is not known.');
    const paid = new Map(ifs); paid.set('w4', lineIfOf(1.2, 'Wrapper', { ...LINE4, crew: 2, labourRatePerHour: 12 }, undefined));
    expect(spreadIfOf(cands, paid)?.labour).toBeCloseTo(75 + 56.16 + 28.8, 6);
    expect(spreadIfOf(cands, paid)?.noWage).toEqual([]);
    expect(spreadIfSays(worth, [], ifs)).toBe('');
  });
  it('a part is never a partial total: no speed keeps the packs and contribution out, no margin the contribution, each line named', () => {
    const odd = new Map(ifs); odd.set('w4', lineIfOf(1.2, 'Wrapper', { crew: 2, labourRatePerHour: 12 }, undefined)); odd.set('w7', lineIfOf(1.2, 'Wrapper', { ...LINE7, marginPerPack: undefined }, undefined));
    const s = spreadIfOf(cands, odd)!;
    expect(s.packs).toBeUndefined(); expect(s.contribution).toBeUndefined(); expect(s.labour).toBeCloseTo(75 + 56.16 + 28.8, 6);
    expect(s.noSpeed).toEqual(['Line 4']); expect(s.noMargin).toEqual(['Line 7']); expect(s.countedAsStop).toEqual([]);
    if (worth.kind !== 'worth') throw new Error('worth');
    expect(spreadIfSays(worth, cands, odd)).toBe('If it brings back the same 1.2 h a week on the 3 lines not yet answered: £160 labour a week — an if, not earned: each line proves it by its own before → after. The packs and the contribution are not added up — Line 4 has no speed (Set up the line). The contribution is not added up — Line 7 has no margin a pack (Set up the line).');
    expect(spreadIfOf(cands, new Map([['w7', ifs.get('w7')!]]))).toBeUndefined();
  });
  it('the source line with no wage: the board’s packs and contribution said, the wage asked; the other lines still priced by their own', () => {
    const m = fixMoneyOf(40, measure(3), problemMoney(measure(3), { whole: true }, { packsPerMin: 60, marginPerPack: 0.06 }, undefined), { onProblem: true });
    expect(fixMoneySays(FIX, m)).toBe('What it is worth on Line 3, by the share its 6M board gives it — 40% of the problem’s 3 h a week, so 1.2 h a week: 4,320 packs · £259 contribution a week; give Line 3 a wage (Set up the line) to say the labour.');
    expect(m.kind === 'worth' && m.hours).toBeCloseTo(1.2, 9);
    const bare = fixMoneyOf(40, measure(3), problemMoney(measure(3), { whole: true }, {}, undefined), { onProblem: true });
    expect(fixMoneySays(FIX, bare)).toBe('What it is worth on Line 3, by the share its 6M board gives it — 40% of the problem’s 3 h a week, so 1.2 h a week — give Line 3 a wage and a speed (Set up the line) to say the labour and the packs.');
  });
  it('7 — no money without a share, a problem, hours a week or anything measured: each said once, nothing estimated', () => {
    expect(fixMoneySays(FIX, fixMoneyOf(undefined, measure(3), money3, { onProblem: true }))).toBe('No money is said: its 6M board gives it no share of the problem — type How much of the problem it should remove on the countermeasure (its 6M board) to say what it is worth, here and on every line.');
    expect(fixMoneyOf(0, measure(3), money3, { onProblem: true }).kind).toBe('none');
    expect(fixMoneySays(FIX, fixMoneyOf(40, undefined, undefined, { onProblem: false }))).toMatch(/^No money is said: on its 6M board the countermeasure answers no problem/);
    expect(fixMoneySays(FIX, fixMoneyOf(40, measure(500, 'ppm'), undefined, { onProblem: true }))).toBe('No money is said: its problem is measured in ppm, not hours a week, so its 6M board puts no money on it.');
    expect(fixMoneySays(FIX, fixMoneyOf(40, null, undefined, { onProblem: true }))).toBe('No money is said: its problem on the 6M board has no hours a week lost measured yet.');
    expect(fixMoneyOf(40, measure(0), problemMoney(measure(0), { whole: true }, LINE3, undefined), { onProblem: true })).toEqual({ kind: 'none', why: 'not-measured' });
  });
  it('the method row carries the sum, or why no money is said', () => {
    if (worth.kind !== 'worth') throw new Error('worth');
    expect(projectSpreadSays([{ fix: FIX, cands, money: worth, ifs }])?.says).toBe(`Splice guide proved on Line 3 — 3 lines with the Wrapper, 3 not yet answered. ${spreadIfSays(worth, cands, ifs)}`);
    expect(projectSpreadSays([{ fix: FIX, cands, money: { kind: 'none', why: 'no-share' } }])?.says).toMatch(/3 not yet answered\. No money is said: its 6M board gives it no share/);
    expect(projectSpreadSays([{ fix: FIX, cands }])?.says).toBe('Splice guide proved on Line 3 — 3 lines with the Wrapper, 3 not yet answered.');
  });
});
