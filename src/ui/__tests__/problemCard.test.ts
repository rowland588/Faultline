/**
 * The problem card's words (ui/ProblemCard.tsx) — Problem · Why · Fix · Did it
 * work. What a chain says, when it asks the person to go and look, the bone a
 * new chain starts on, what one tap and one voice note put on the fish, and
 * "did it work" in words.
 */
import { describe, it, expect } from 'vitest';
import {
  answersOf, causeFromStart, causeFromWords, defaultBone, freshStarts, needsLook, workedWords,
} from '../ProblemCard';
import type { Cause } from '../../lib/sixm';
import type { ProblemView } from '../../lib/problems';
import type { PaceAction } from '../../lib/tracker';
import type { Case } from '../../types';

const cause = (more: Partial<Cause> = {}): Cause =>
  ({ id: 'c1', m: 'machine', text: 'Baskets catch on the rail', grade: 'observed', status: 'suspected', whys: [], at: 0, ...more });
const problem = (source?: Case['source']): Case =>
  ({ id: 'p1', workspaceId: 'w', title: 'Basketer minor stops', path: [], baselineMsWeek: 0, status: 'open', openedAt: 0, updatedAt: 0, ...(source ? { source } : {}) });
const act = (status: string): PaceAction => ({ ref: 'a', priority: 3, line: 'L', category: '', status, flag: '' });
const view = (o: Partial<ProblemView>): ProblemView =>
  ({ problem: problem(), phase: 'acting', bones: [], measure: null, actions: [], roots: [], says: '', ...o });

describe('a chain, as the card reads it', () => {
  it('is the first answer, then each why, the last of a rooted chain marked the root', () => {
    const c = cause({ status: 'confirmed', root: true, whys: [{ id: 'w1', text: 'Groove worn', grade: 'observed' }, { id: 'w2', text: ' ', grade: 'reported' }, { id: 'w3', text: 'No PM owner', grade: 'reported' }] });
    const a = answersOf(c);
    expect(a.map(x => x.text)).toEqual(['Baskets catch on the rail', 'Groove worn', 'No PM owner']);
    expect(a.map(x => x.root)).toEqual([false, false, true]);
    expect(a.map(x => x.grade)).toEqual(['observed', 'observed', 'reported']);
  });
  it('marks no root on a ruled-out chain, nor on one with no whys', () => {
    expect(answersOf(cause({ root: true, status: 'ruled_out', whys: [{ id: 'w', text: 'x' }] })).some(x => x.root)).toBe(false);
    expect(answersOf(cause({ root: true })).some(x => x.root)).toBe(false);
  });
});

describe('go and look before the next why', () => {
  it('asks when the deepest answer is only told', () => {
    expect(needsLook(cause({ grade: 'reported' }))).toBe(true);
    expect(needsLook(cause({ whys: [{ id: 'w', text: 'Because', grade: 'reported' }] }))).toBe(true);
  });
  it('does not ask when it was seen, counted or in the data, or the chain is ruled out', () => {
    expect(needsLook(cause({ grade: 'observed' }))).toBe(false);
    expect(needsLook(cause({ grade: 'reported', whys: [{ id: 'w', text: 'Because', grade: 'measured' }] }))).toBe(false);
    expect(needsLook(cause({ grade: 'reported', status: 'ruled_out' }))).toBe(false);
    /* a why nobody graded is not "told" — it says nothing either way */
    expect(needsLook(cause({ grade: 'reported', whys: [{ id: 'w', text: 'Because' }] }))).toBe(false);
  });
  it('a photo on a first answer is something seen', () => {
    expect(needsLook(cause({ grade: 'reported', media: [{ id: 'm', kind: 'photo' } as never] }))).toBe(false);
  });
});

describe('the bone a new chain starts on', () => {
  it('guesses from the bar’s words, and is Machine with nothing to go on', () => {
    expect(defaultBone(problem())).toBe('machine');
    expect(defaultBone(problem({ kind: 'pareto', category: 'Minor stop', subcategory: 'Film splice' }))).toBe('material');
  });
});

describe('one tap, one voice note', () => {
  it('a starting answer goes on known from the data, suspected, pointing at its bar', () => {
    const c = causeFromStart({ text: ' Misfeed ', minutesWeek: 24, m: 'machine', ref: 'category=Minor stop' }, { id: 'n', at: 5, by: 'Rowland' });
    expect(c).toMatchObject({ id: 'n', m: 'machine', text: 'Misfeed', grade: 'measured', status: 'suspected', whys: [], by: 'Rowland',
      source: { kind: 'pareto', ref: 'category=Minor stop', label: 'Misfeed', minutesWeek: 24 } });
  });
  it('an answer already on the fish is not offered again', () => {
    const starts = [{ text: 'Misfeed', minutesWeek: 10, m: 'machine' as const }, { text: 'Jam', minutesWeek: 5, m: 'machine' as const }];
    expect(freshStarts(starts, [cause({ text: 'misfeed' })]).map(s => s.text)).toEqual(['Jam']);
  });
  it('a spoken chain is the first answer and its whys, told, suspected, with no root', () => {
    let i = 0;
    const c = causeFromWords([' Blade snapped ', '', 'It was blunt', 'No change interval'], 'method', { newId: () => `id${++i}`, at: 1 });
    expect(c).toMatchObject({ id: 'id1', m: 'method', text: 'Blade snapped', grade: 'reported', status: 'suspected' });
    expect(c?.whys.map(w => w.text)).toEqual(['It was blunt', 'No change interval']);
    expect(c?.whys.every(w => w.grade === 'reported')).toBe(true);
    expect(c?.root).toBeUndefined();
    expect(causeFromWords(['  '], 'method', { newId: () => 'x', at: 1 })).toBeNull();
  });
});

describe('did it work, in words', () => {
  const m = { label: 'Basketer', unit: 'h a week', before: 3.4, now: 2, better: 'lower' as const };
  it('is not measured with no number, and not judged until a fix is done', () => {
    expect(workedWords(view({})).text).toMatch(/^Not measured yet/);
    expect(workedWords(view({ measure: m, actions: [act('To do')] }))).toEqual({ tone: 'n', text: 'Not judged yet — a full week after the last fix is done' });
  });
  it('is being checked until a full week has passed, then says which way it moved', () => {
    expect(workedWords(view({ measure: m, actions: [act('Done')] })).tone).toBe('w');
    expect(workedWords(view({ measure: { ...m, moved: 'better' }, actions: [act('Done')] }))).toEqual({ tone: 'g', text: 'It moved the right way' });
    expect(workedWords(view({ measure: { ...m, moved: 'worse' }, actions: [act('Done')] })).tone).toBe('r');
    expect(workedWords(view({ measure: { ...m, moved: 'same' }, actions: [act('Done')] }))).toEqual({ tone: 'n', text: 'Not moved yet' });
  });
});
