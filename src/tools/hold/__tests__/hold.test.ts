/* FC-135 product on hold — the arithmetic against scripts/knowledge/cases-t8-3.py (a second implementation): the record's worked case (4,800 packs, 6 days, 21 days of
 * life) and the six-hold register; the two-parts money rule; the parts a hold must say; the Pareto of causes. */
import { describe, expect, it } from 'vitest';
import { holdAnalyse, readHold, type HoldOut } from '../hold';
import def from '../../scored/defs/hold';
import type { ScoredRow } from '../../../lib/study';
import type { ScoredContext } from '../../scored/types';

const TODAY = '2026-11-01';
const INP = { rate: 25, costToDate: 0.53, margin: 0.35, carryPct: 12 };
const ctx = (inputs: ScoredContext['inputs'] = INP): ScoredContext => ({ today: TODAY, now: Date.parse('2026-11-01T10:00:00Z'), inputs, studies: [] });
const out = (rows: ScoredRow[], c = ctx()): HoldOut => { const r = holdAnalyse({ rows, ctx: c }); if ('problems' in r) throw new Error(r.problems.join(' ')); return r; };
const example = def.examples[0].rows;

describe('the record’s worked case — by hand and by the second implementation', () => {
  const seal: ScoredRow = { id: 'a', name: 'Seal', hold: { qty: 4800, raisedOn: '2026-10-26', life: 21, reason: 'seal', decider: 'QA', segregated: true } };
  it('4,800 packs held 6 days: £2,544 tied up, carried at 12% £5.02, 28.6% of 21 days of life gone', () => {
    const r = readHold(seal, 1, TODAY, INP);
    expect(r.days).toBe(6); expect(r.tiedUp).toBeCloseTo(2544, 6); expect(r.carry).toBeCloseTo(5.0183, 4); expect(r.lifeUsed).toBeCloseTo(0.285714, 6);
  });
  it('if destroyed it lost £2,544 + £1,680 margin not earned = £4,224 (no disposal typed)', () => {
    const r = readHold({ ...seal, hold: { ...seal.hold, fate: 'destroy', decidedOn: '2026-11-01' } }, 1, TODAY, INP);
    expect(r.lost).toBeCloseTo(4224, 6); expect(r.tiedUp).toBeUndefined();
  });
});

describe('the six-hold register', () => {
  it('two open (6,000 packs, the oldest 6 d, £3,180 tied up), four decided (£3,145 lost) — tied up and lost never added', () => {
    const o = out(example), t = Object.fromEntries(o.result.tiles.map(x => [x.k, x]));
    expect(o.result.verdict).toBe('2 on hold'); expect(o.result.tone).toBe('r');
    expect(t['On hold']).toMatchObject({ v: '2', of: 'of 6 holds' }); expect(t['Packs held'].v).toBe('6,000'); expect(t['Oldest'].v).toBe('6 d');
    expect(t['Tied up']).toMatchObject({ v: '£3,180', of: 'not lost' }); expect(t['Lost, decided']).toMatchObject({ v: '£3,145', of: '4 holds' });
    expect(o.result.money?.[0]).toContain('£3,180 is tied up in 2 open holds'); expect(o.result.money?.[0]).toContain('≈ £5 so far');
    expect(o.result.money?.join(' ')).toContain('destroyed £2,790'); expect(o.result.money?.join(' ')).toContain('released £50'); expect(o.result.money?.join(' ')).toContain('reworked £145'); expect(o.result.money?.join(' ')).toContain('regraded £160');
    expect(o.result.money?.join(' ')).toContain('Tied up and lost are never added.');
  });
  it('is ordered open first, oldest first, then the decided newest first; each fate’s loss as the second implementation prints it', () => {
    const o = out(example), e = def.examples[0].expect;
    expect(o.ranked.map(r => r.name)).toEqual(e.order);
    const by = (n: string) => o.reads.find(r => r.name.startsWith(n));
    expect([by('Baby')?.lost, by('Maris 500 g — seal check in error')?.lost, by('Tesco')?.lost, by('Maris 500 g — re-seal')?.lost]).toEqual([2790, 50, 160, 145]);
    expect([by('Maris 500 g — failed')?.days, by('King')?.days, by('Baby')?.days]).toEqual([6, 2, 2]);
    expect(by('King')?.tiedUp).toBeCloseTo(636, 6);
  });
  it('the sentence names the late decision, the decided by fate and the repeating cause; the Pareto lists it', () => {
    const o = out(example);
    expect(o.result.sentence).toContain('2 holds open — 6,000 packs held, the oldest 6 days (Maris 500 g — failed seal check).');
    expect(o.result.sentence).toContain('1 decision past its day: Maris 500 g — failed seal check (due 30 Oct).');
    expect(o.result.sentence).toContain('4 holds decided: 1 released, 1 reworked, 1 regraded, 1 destroyed.');
    expect(o.result.sentence).toContain('Seal has held product 3 times (8,100 packs) — a repeating cause is worth an 8D.');
    expect(o.causes[0]).toEqual({ cause: 'Seal', holds: 3, packs: 8100 });
    expect(o.result.also?.lines[0]).toBe('Seal — 3 holds, 8,100 packs · repeating');
  });
  it('a hold with no decision day is called a slow destroy; a hold not segregated or with no authority says so', () => {
    const o = out([{ id: 'x', name: 'Loose', hold: { qty: 100, reason: 'r', raisedOn: '2026-10-31' } }]);
    expect(o.result.sentence).toContain('no day for the decision'); expect(o.result.sentence).toContain('still has to say who may release it, that it is segregated');
    expect(o.result.tone).toBe('a');
  });
});

describe('a missing input is named and nothing waits on it', () => {
  it('no cost to date: the tied-up tile is a dash, the money line names it; a decided destroy names what it lacks', () => {
    const o = out(example, ctx({ rate: 25 }));
    expect(o.result.tiles.find(t => t.k === 'Tied up')).toMatchObject({ v: '—', of: 'cost not given' });
    expect(o.result.money?.join(' ')).toContain('To say it in money give what a pack cost to this point (materials and labour), the margin a pack');
    expect(o.reads.find(r => r.name.startsWith('Baby'))?.lostMissing).toEqual(['what a pack cost to this point (materials and labour)', 'the margin a pack']);
    expect(o.result.verdict).toBe('2 on hold');
  });
  it('a release with no hours or no wage is not priced, never guessed', () => {
    const rel: ScoredRow = { id: 'r', name: 'R', hold: { qty: 10, raisedOn: '2026-10-30', fate: 'release', decidedOn: '2026-10-31' } };
    expect(readHold(rel, 1, TODAY, INP).lostMissing).toEqual(['the hours it took']);
    expect(readHold({ ...rel, hold: { ...rel.hold, hours: 2 } }, 1, TODAY, {}).lostMissing).toEqual(['£ an hour']);
  });
  it('nothing named says what to name; nothing open is green', () => {
    expect(holdAnalyse({ rows: [{ id: 'z', name: ' ', hold: {} }], ctx: ctx() })).toEqual({ problems: [expect.stringContaining('Name at least one hold')] });
    const o = out(example.filter(r => r.hold?.fate));
    expect(o.result.verdict).toBe('None on hold'); expect(o.result.tone).toBe('g'); expect(o.result.sentence).toContain('Nothing is on hold. 4 holds decided');
  });
});
