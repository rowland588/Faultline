/* FC-178 — hygienic design review (knowledge/specs/FC-178-hygienic-design.md). There is no formula from a standard to check against: the figures are
 * counts of what the reviewers typed, hand-counted on the example below — and the grades and gates are Faultline's, which the tests hold the words of. */
import { describe, expect, it } from 'vitest';
import type { ScoredRow } from '../../../lib/study';
import def from '../../scored/defs/hygienic-design';
import { studyScored } from '../../scored/scored';
import { STARTER, hygiene, hygieneTable, summarizeHygiene, type HygieneResult } from '../hygiene';

const TODAY = '2026-11-02';
const ex = def.examples[0];
const ok = (rows: ScoredRow[]): HygieneResult => { const r = hygiene({ rows, today: TODAY }); if (!('ok' in r)) throw new Error(r.problems.join(' ')); return r.ok; };
const row = (name: string, o: Partial<ScoredRow> = {}): ScoredRow => ({ id: name, name, group: 'Product contact', status: 'unchecked', ...o });

describe('a new slicer at FAT, hand-counted', () => {
  const r = ok(ex.rows);
  it('18 points: 12 checked, 4 findings open (2 critical, 1 major, 1 minor), 1 closed, 6 to check, 1 late', () => {
    expect([r.total, r.checked, r.meets, r.na, r.unchecked, r.closed.length, r.open.length]).toEqual([18, 12, 6, 1, 6, 1, 4]);
    expect([r.byGrade.critical.length, r.byGrade.major.length, r.byGrade.minor.length, r.late.length]).toEqual([2, 1, 1, 1]);
  });
  it('open findings come worst first, then by day', () => {
    expect(r.open.map(p => p.grade)).toEqual(['critical', 'critical', 'major', 'minor']);
    expect(r.open[0].name).toMatch(/hollow rollers/); // the late one is first of the criticals
  });
  it('says the gates are Faultline’s and what must close before SAT', () => {
    const s = summarizeHygiene(r);
    expect(s.verdict).toBe('3 to close before SAT');
    expect(s.tone).toBe('r');
    expect(s.sentence).toBe('12 of 18 points checked, 1 do not apply. 4 findings open — 2 critical, 1 major, 1 minor; 1 past their day. 1 finding closed and re-checked. 2 critical findings must close before shipment (FAT) — or the design changes. 1 major finding must close before site acceptance (SAT).');
    expect(s.caveats[1]).toMatch(/grades.*and the gates.*are Faultline’s own/);
    expect(s.caveats[0]).toMatch(/not an EHEDG, EN 1672-2 or EN ISO 14159 assessment/);
    expect(Object.fromEntries(s.tiles.map(t => [t.k, t.v]))).toMatchObject({ Checked: '12 of 18', 'Open findings': '4', 'To close before SAT': '3', Closed: '1', 'Past their day': '1' });
    expect(s.money).toBeUndefined();
  });
  it('lists the findings and when each closes; the page’s reading is the module’s', () => {
    const s = summarizeHygiene(r);
    expect(s.lists?.[1]).toEqual({ title: 'Each closes by', lines: ['Critical: 2 findings — before shipment (FAT).', 'Major: 1 finding — before site acceptance (SAT).', 'Minor: 1 finding — before handover.'] });
    expect(studyScored({ agreed: { scored: { key: 'hygienic-design', rows: ex.rows } } })?.result?.verdict).toBe('3 to close before SAT');
  });
  it('the table runs by zone with each zone’s count under it', () => {
    const t = hygieneTable(r);
    expect(t.head).toHaveLength(7);
    expect(t.rows).toHaveLength(18);
    expect(t.foot.map(f => f[0])).toEqual(['Product contact', 'Splash zone', 'Non-product zone']);
    expect(t.shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});

describe('the verdicts', () => {
  it('nothing checked is not started; clear only when everything is checked and every finding closed', () => {
    expect(summarizeHygiene(ok([row('A'), row('B')])).verdict).toBe('Not started');
    const clear = summarizeHygiene(ok([row('A', { status: 'meets' }), row('B', { status: 'closed', severity: 'major', note: 'Re-piped, seen again' }), row('C', { status: 'na' })]));
    expect(clear.verdict).toBe('Clear for SAT');
    expect(clear.tone).toBe('g');
    expect(clear.closing).toMatch(/not a certification\.$/);
  });
  it('only minors open: no gate, amber; unchecked points keep SAT from being called clear', () => {
    const a = summarizeHygiene(ok([row('A', { status: 'finding', severity: 'minor' }), row('B', { status: 'meets' })]));
    expect([a.verdict, a.tone]).toEqual(['1 finding open', 'a']);
    const b = summarizeHygiene(ok([row('A', { status: 'meets' }), row('B')]));
    expect([b.verdict, b.tone]).toEqual(['1 still to check', 'a']);
    expect(b.sentence).toMatch(/not checked yet, so SAT cannot yet be called clear\.$/);
  });
  it('a finding with no grade is said, not guessed; a closed one with nothing written is not evidence', () => {
    const r = ok([row('A', { status: 'finding' }), row('B', { status: 'closed', severity: 'major' })]);
    expect(r.ungraded.map(p => p.name)).toEqual(['A']);
    expect(summarizeHygiene(r).sentence).toMatch(/1 not graded yet/);
    expect(summarizeHygiene(r).caveats.join(' ')).toMatch(/closed with nothing written about the re-check: B\. A finding closed without evidence is still open\./);
  });
  it('late is a finding only, after its day', () => {
    expect(ok([row('A', { status: 'finding', severity: 'major', due: '2026-11-01' })]).late.length).toBe(1);
    expect(ok([row('A', { status: 'finding', severity: 'major', due: TODAY })]).late.length).toBe(0);
    expect(ok([row('A', { status: 'meets', due: '2020-01-01' })]).late.length).toBe(0);
  });
});

describe('refused, in words', () => {
  it('nothing to check, a state, a grade or a day it does not know', () => {
    const say = (rows: ScoredRow[]) => { const r = hygiene({ rows, today: TODAY }); return 'problems' in r ? r.problems.join(' ') : ''; };
    expect(say([])).toMatch(/Add at least one point to check/);
    expect(say([row('A', { status: 'maybe' })])).toMatch(/its state is not one the review knows/);
    expect(say([row('A', { severity: 'huge' })])).toMatch(/a grade is critical, major or minor/);
    expect(say([row('A', { due: 'soon' })])).toMatch(/the day is not a date/);
  });
});

describe('the starter list', () => {
  it('is in three zones, each point citing its principle by topic only — no clause, number or limit', () => {
    expect(new Set(STARTER.map(s => s.group))).toEqual(new Set(['Product contact', 'Splash zone', 'Non-product zone']));
    expect(STARTER.every(s => /^EHEDG Guideline 8, hygienic design principles — [a-z ,]+$/.test(s.source ?? ''))).toBe(true);
    expect(STARTER.map(s => `${s.name} ${(s.source ?? '').replace('Guideline 8', '')}`).join(' ')).not.toMatch(/\d/);
    expect(STARTER.every(s => s.status === 'unchecked')).toBe(true);
  });
  it('grades follow the record’s rule by zone: product contact critical (access aside), splash major, non-product minor', () => {
    const g = (z: string) => [...new Set(STARTER.filter(s => s.group === z).map(s => s.severity))];
    expect(g('Splash zone')).toEqual(['major']);
    expect(g('Non-product zone')).toEqual(['minor']);
    expect(STARTER.filter(s => s.group === 'Product contact' && s.severity === 'critical').length).toBeGreaterThanOrEqual(8);
  });
});
