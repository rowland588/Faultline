/* FC-082 — operational readiness (knowledge/specs/FC-082-operational-readiness.md).
 * Independent case: scripts/knowledge/cases-operations.py, the readiness block (a second implementation, run with `python3 -I`):
 * 72 items in six areas — people 14/18, SOPs 9/11, HACCP 3/4, spares 22/30, PM 6/6, cleaning 2/3 — 56 of 72 ready, 16 open, 3 past their day;
 * the gate is every item, not the 78%. */
import { describe, expect, it } from 'vitest';
import type { ScoredRow } from '../../../lib/study';
import def from '../../scored/defs/readiness';
import { studyScored } from '../../scored/scored';
import { STARTER, readiness, readinessTable, summarizeReadiness, type ReadinessResult } from '../readiness';

const TODAY = '2026-11-02';
const ex = def.examples[0];
const ok = (rows: ScoredRow[], today = TODAY): ReadinessResult => { const r = readiness({ rows, today }); if (!('ok' in r)) throw new Error(r.problems.join(' ')); return r.ok; };
const row = (name: string, o: Partial<ScoredRow> = {}): ScoredRow => ({ id: name, name, group: 'People', status: 'open', ...o });

describe('the python case — 72 items in six areas', () => {
  const r = ok(ex.rows);
  it('56 of 72 ready, 16 open, 3 past their day — and the area counts as the python says them', () => {
    expect([r.total, r.ready, r.open, r.late.length, r.na]).toEqual([72, 56, 16, 3, 0]);
    expect(r.areas.map(a => [a.area, a.ready, a.total])).toEqual([
      ['People trained and signed off', 14, 18], ['SOPs and standards issued', 9, 11], ['HACCP plan amended and validated', 3, 4],
      ['Spares on the shelf', 22, 30], ['PM schedule loaded', 6, 6], ['Cleaning validated', 2, 3],
    ]);
  });
  it('the two that stop day one are the HACCP validation and the cleaning validation', () => {
    expect(r.stoppers.map(i => i.name)).toEqual(['HACCP validation', 'Cleaning validation']);
  });
  it('says the gate is every item — the count, never only 78%', () => {
    const s = summarizeReadiness(r, {});
    expect(s.verdict).toBe('16 open, 3 late');
    expect(s.tone).toBe('r');
    expect(s.sentence).toBe('Readiness: 56 of 72 items ready; 16 open, 3 past their day. HACCP validation and cleaning validation would stop day one.');
    expect(s.sentence).not.toMatch(/78/);
    expect(Object.fromEntries(s.tiles.map(t => [t.k, t.v]))).toMatchObject({ Ready: '56 of 72', Open: '16', 'Past their day': '3', 'Would stop day one': '2' });
  });
  it('the page’s reading is the module’s', () => {
    const x = studyScored({ agreed: { scored: { key: 'readiness', rows: ex.rows } } });
    expect(x?.result?.verdict).toBe('16 open, 3 late');
    expect(x?.table?.rows.length).toBe(72);
  });
});

describe('the counts', () => {
  it('open by owner (the nobody group last of those named), late by day, wishes', () => {
    const r = ok([
      row('A', { owner: 'Dee', due: '2026-10-30' }), row('B', { owner: 'dee', due: '2026-12-01' }), row('C', { owner: 'Ali', due: '2026-12-01' }), row('D', {}), row('E', { owner: 'Ali' }),
      row('F', { status: 'ready', owner: 'Ali', due: '2026-10-01', note: 'Record 12' }),
    ]);
    expect(r.owners.map(o => [o.owner, o.open.map(i => i.name), o.late])).toEqual([['Dee', ['A', 'B'], 1], ['Ali', ['C', 'E'], 0], ['Nobody yet', ['D'], 0]]);
    expect(r.late.map(i => i.name)).toEqual(['A']);
    expect(r.wishes).toEqual({ noOwner: 1, noDay: 2, either: 2 });
    expect(r.noEvidence).toEqual([]);
  });
  it('a ready item is not late however old its day; a not-needed item is not open', () => {
    const r = ok([row('A', { status: 'ready', due: '2020-01-01' }), row('B', { status: 'na', due: '2020-01-01' }), row('C', { due: TODAY })]);
    expect(r.late).toEqual([]);
    expect([r.ready, r.na, r.open]).toEqual([1, 1, 1]);
  });
  it('a day is late only after it: today is not late', () => {
    expect(ok([row('A', { due: '2026-11-01' })]).late.length).toBe(1);
    expect(ok([row('A', { due: '2026-11-02' })]).late.length).toBe(0);
  });
  it('a ready item with nothing written as evidence is named', () => {
    const r = ok([row('Operators trained', { status: 'ready' }), row('SOPs', { status: 'ready', note: 'SOP 14' })]);
    expect(r.noEvidence.map(i => i.name)).toEqual(['Operators trained']);
    expect(summarizeReadiness(r, {}).sentence).toMatch(/1 ready item has no evidence written — a tick is not a record\.$/);
  });
  it('items with no area go under Other, in the order first seen', () => {
    const r = ok([row('A', { group: undefined }), row('B', { group: 'Food' }), row('C', { group: ' food ' })]);
    expect(r.areas.map(a => a.area)).toEqual(['Other', 'Food', 'food']);
  });
});

describe('what it says', () => {
  it('all ready or not needed meets the gate, green', () => {
    const s = summarizeReadiness(ok([row('A', { status: 'ready', note: 'x' }), row('B', { status: 'na' })]), {});
    expect(s.verdict).toBe('Ready to hand over');
    expect(s.tone).toBe('g');
    expect(s.sentence).toBe('Readiness: 1 of 2 items ready, 1 not needed here — every item is done or not needed, so the gate is met.');
    expect(s.closing).toMatch(/^Production can take the line over/);
    expect(s.money).toBeUndefined();
  });
  it('open and not late is amber; an open stopper or a late item is red', () => {
    expect(summarizeReadiness(ok([row('A', { due: '2026-12-01' })]), {}).tone).toBe('a');
    expect(summarizeReadiness(ok([row('A', { due: '2026-12-01', stopper: true })]), {}).tone).toBe('r');
    expect(summarizeReadiness(ok([row('A', { due: '2026-10-01' })]), {}).tone).toBe('r');
  });
  it('the lists: the stoppers with their owner and day, open by owner, by area', () => {
    const s = summarizeReadiness(ok([row('HACCP validation', { owner: 'QA lead', due: '2026-10-30', stopper: true, group: 'Food' }), row('Spares', { group: 'Maint', status: 'ready', note: 'List 3' })]), {});
    expect(s.lists?.map(l => l.title)).toEqual(['Would stop day one', 'Open, by who owns them', 'By area']);
    expect(s.lists?.[0].lines).toEqual(['HACCP validation — QA lead, by 30 Oct (late).']);
    expect(s.lists?.[1].lines).toEqual(['QA lead: HACCP validation (late).']);
    expect(s.lists?.[2].lines).toEqual(['Food: 0 of 1 ready, 1 open.', 'Maint: 1 of 1 ready.']);
  });
  it('money: named when missing, said when given — and only while a stopper is open', () => {
    const rows = [row('HACCP validation', { stopper: true })];
    expect(summarizeReadiness(ok(rows), {}).money).toEqual(['Give what a day of the line not making costs to say what a day’s wait for start-up is worth — readiness is the cheapest insurance the project buys.']);
    expect(summarizeReadiness(ok(rows), { dayCost: 9600 }).money).toEqual(['While 1 item that would stop day one is open, each day production cannot start is a day of the line not making: £9.6k (the figure you gave).']);
    expect(summarizeReadiness(ok([row('X')]), { dayCost: 9600 }).money).toBeUndefined();
  });
  it('the table: area, item with its stopper, owner, day, state with late, the evidence — and each area’s count under it', () => {
    const t = readinessTable(ok([row('HACCP validation', { group: 'Food', owner: 'QA lead', due: '2026-10-30', stopper: true, evidence: 'The validation record' }), row('Spares', { group: 'Maint', status: 'ready', note: 'List 3', owner: 'Eng' })]));
    expect(t.head).toEqual(['Area', 'Item', 'Owner', 'Day', 'State', 'Evidence']);
    expect(t.rows).toEqual([['Food', 'HACCP validation (would stop day one)', 'QA lead', '30 Oct', 'Not yet — late', 'The validation record'], ['Maint', 'Spares', 'Eng', '—', 'Ready', 'List 3']]);
    expect(t.foot).toEqual([['Food', '0 of 1 ready', '', '', '1 open', ''], ['Maint', '1 of 1 ready', '', '', 'done', '']]);
    expect(t.shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});

describe('refused, in words', () => {
  it('no items; a state that is not one; a day that is not a date', () => {
    const say = (rows: ScoredRow[]) => { const r = readiness({ rows, today: TODAY }); return 'problems' in r ? r.problems.join(' ') : ''; };
    expect(say([])).toMatch(/Add at least one item/);
    expect(say([row('A', { status: 'maybe' })])).toMatch(/“A”: its state must be Not yet, Ready or Not needed here\./);
    expect(say([row('A', { due: 'Friday' })])).toMatch(/“A”: the day is not a date\./);
  });
});

describe('the starter list', () => {
  it('is for a new line, in areas, with the food-safety items marked as stopping day one and every item open', () => {
    expect(STARTER.length).toBeGreaterThanOrEqual(20);
    expect(new Set(STARTER.map(s => s.group)).size).toBeGreaterThanOrEqual(5);
    expect(STARTER.every(s => s.status === 'open' && !!s.evidence)).toBe(true);
    expect(STARTER.filter(s => s.stopper).map(s => s.name)).toEqual(expect.arrayContaining(['HACCP amendment validated', 'Cleaning procedure validated']));
    expect(new Set(STARTER.map(s => s.name)).size).toBe(STARTER.length);
  });
});
