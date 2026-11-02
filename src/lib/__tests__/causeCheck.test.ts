/* FC-148 part A — choosing what to verify (knowledge/specs/FC-148-why-tree.md §6, §7, criteria 1–3). */
import { describe, expect, it } from 'vitest';
import type { Cause } from '../sixm';
import { canAskWhy, checkActionRow, checkStateOf, orderForCheck, stepSays, whyClosedSays } from '../causeCheck';

const c = (id: string, extra: Partial<Cause> = {}): Cause => ({ id, m: 'method', text: `Cause ${id}`, grade: 'observed', status: 'suspected', whys: [], at: Number(id.replace(/\D/g, '')) || 0, ...extra });
const TODAY = '2026-11-03';

describe('the order of the causes to check', () => {
  it('rated before unrated, most likely first, then the share, then the order added — no score multiplied', () => {
    const list = [c('1'), c('2', { likely: 'possible', explains: 'most' }), c('3', { likely: 'likely', explains: 'little' }), c('4', { likely: 'likely', explains: 'most' }), c('5', { likely: 'unlikely', explains: 'most' })];
    expect(orderForCheck(list).map(x => x.id)).toEqual(['4', '3', '2', '5', '1']);
  });
  it('suspected, then confirmed, then ruled out', () => {
    const list = [c('1', { status: 'ruled_out' }), c('2', { status: 'confirmed' }), c('3')];
    expect(orderForCheck(list).map(x => x.id)).toEqual(['3', '2', '1']);
  });
});

describe('where a cause stands, in words', () => {
  it('not rated · rated · to check · checking · confirmed · ruled out', () => {
    expect(checkStateOf(c('1'), TODAY).word).toBe('Not rated');
    expect(checkStateOf(c('1', { likely: 'likely', explains: 'most' }), TODAY).word).toBe('Likely · Most');
    expect(checkStateOf(c('1', { tick: true }), TODAY).word).toBe('To check — no check written');
    expect(checkStateOf(c('1', { tick: true, check: { what: 'Pull the splice log', by: '2026-11-06' } }), TODAY).word).toBe('Checking (by Fri 6 Nov 2026)');
    expect(checkStateOf(c('1', { status: 'confirmed', grade: 'counted' }), TODAY).word).toBe('Confirmed (counted)');
    expect(checkStateOf(c('1', { status: 'ruled_out' }), TODAY).word).toBe('Ruled out');
  });
  it('a check past its day is red and says so; nothing else is', () => {
    const s = checkStateOf(c('1', { tick: true, check: { what: 'x', by: '2026-11-01' } }), TODAY);
    expect(s.tone).toBe('r');
    expect(s.late).toBe(true);
    expect(checkStateOf(c('1', { tick: true, check: { what: 'x', by: '2026-11-06' } }), TODAY).tone).toBe('n');
  });
  it('a cause drilled before it was checked says so and is not locked', () => {
    const d = c('1', { whys: [{ id: 'w', text: 'Because' }] });
    expect(checkStateOf(d, TODAY).word).toBe('Drilled before it was checked');
    expect(canAskWhy(d)).toBe(true);
  });
});

describe('the whys open only on a confirmed cause', () => {
  it('suspected and ruled out are closed, and say why', () => {
    expect(canAskWhy(c('1'))).toBe(false);
    expect(canAskWhy(c('1', { status: 'ruled_out' }))).toBe(false);
    expect(canAskWhy(c('1', { status: 'confirmed' }))).toBe(true);
    expect(whyClosedSays(c('1'))).toContain('Check it first');
    expect(whyClosedSays(c('1', { tick: true }))).toContain('confirmed');
    expect(whyClosedSays(c('1', { status: 'ruled_out' }))).toContain('Ruled out');
  });
});

describe('the sentence at the top', () => {
  it('nothing rated yet', () => { expect(stepSays([c('1'), c('2')], TODAY)).toBe('Nothing rated yet — say how likely each of the 2 is, then tick the few worth checking.'); });
  it('3 of 9 ticked — 1 confirmed, 1 ruled out, 1 checking (due Fri 6 Nov 2026)', () => {
    const list = [c('1', { tick: true, status: 'confirmed' }), c('2', { tick: true, status: 'ruled_out' }), c('3', { tick: true, check: { what: 'Pull the log', by: '2026-11-06' } }),
      ...['4', '5', '6', '7', '8', '9'].map(i => c(i))];
    expect(stepSays(list, TODAY)).toBe('3 of 9 causes ticked to check — 1 confirmed, 1 ruled out, 1 checking (due Fri 6 Nov 2026).');
  });
  it('a past day is counted', () => {
    expect(stepSays([c('1', { tick: true, check: { by: '2026-11-01' } })], TODAY)).toBe('1 of 1 cause ticked to check — 1 checking (1 past its day).');
  });
});

describe('the check is an action on the board', () => {
  it('carries what, who and the day, points at no cause, and is updated in place', () => {
    const k = c('1', { tick: true, check: { what: 'Pull the splice log for 4 weeks', who: 'Sam', by: '2026-11-06' } });
    const row = checkActionRow(k, { id: 'a1', problemTitle: 'Film breaks', projectId: 'p', lineId: 'l', now: 5 });
    expect(row).toMatchObject({ id: 'a1', what: 'Check: Pull the splice log for 4 weeks', who: 'Sam', due: '2026-11-06', where: 'Film breaks', state: 'todo', projectId: 'p', lineId: 'l' });
    expect(row.causeRef).toBeUndefined();
    const again = checkActionRow({ ...k, check: { ...k.check, who: 'Pat' } }, { id: 'a1', problemTitle: 'Film breaks', projectId: 'p', now: 9, existing: { ...row, state: 'done' } });
    expect(again.who).toBe('Pat');
    expect(again.state).toBe('done');
    expect(again.createdAt).toBe(5);
  });
});
