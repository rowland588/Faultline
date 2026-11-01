/* THE DOCUMENTS THAT TEACH, AGAINST INDEPENDENT CASES — scripts/knowledge/cases-teach.py works every figure a second way. */
import { describe, expect, it } from 'vitest';
import { durationSaid, numberRanges, photoMatch, stepOfCaption, stepTimes } from '../figures/sop';
import { hoursSaved, pointsOf, teachingOf, type Learner } from '../figures/ji';
import { coverOf } from '../figures/opl';
import { runDoc } from '../doc';
import { docByKey } from '../registry';
import type { DocPhoto } from '../types';

const CTX = { today: '2026-11-01' };
const ph = (id: string, field: string, caption?: string): DocPhoto => ({ id, field, blobKey: `k${id}`, mime: 'image/jpeg', at: 1, ...(caption ? { caption } : {}) });

describe('the SOP (cases-teach.py P1)', () => {
  it('a photo belongs to the step its caption starts with: “1 —”, “Step 3:”, “5.” yes; “2.5 mm gap” and words no', () => {
    expect(['1 — isolate', 'Step 3: tube seated', '5. guide at 2 mm', '2.5 mm gap', 'the panel', '9 — extra', '0 start', undefined].map(stepOfCaption)).toEqual([1, 3, 5, undefined, undefined, 9, undefined, undefined]);
  });
  it('against eight steps: photos for 1, 3 and 5; 2, 4, 6, 7, 8 without; one numbered beyond; two unnumbered', () => {
    const m = photoMatch(8, ['1 — isolate', 'Step 3: tube seated', '5. guide at 2 mm', '2.5 mm gap', 'the panel', '9 — extra']);
    expect(m).toEqual({ have: [1, 3, 5], without: [2, 4, 6, 7, 8], beyond: [9], unnumbered: 2 });
  });
  it('the seconds 30+45+60+20+90+40+35+30 are 350 s = 5 min 50 s; a total only when every step is timed', () => {
    const t = stepTimes([30, 45, 60, 20, 90, 40, 35, 30]);
    expect(t).toMatchObject({ total: 350, all: true });
    expect(durationSaid(350)).toBe('5 min 50 s');
    expect(durationSaid(45)).toBe('45 s');
    expect(durationSaid(3600)).toBe('1 h');
    expect(durationSaid(3660)).toBe('1 h 1 min');
    expect(stepTimes([30, undefined]).all).toBe(false);
    expect(stepTimes([]).all).toBe(false);
  });
  it('numbers are said as runs: 1, 2, 3, 5, 7 → “1 to 3, 5 and 7”; two in a row are listed', () => {
    expect(numberRanges([1, 2, 3, 5, 7])).toBe('1 to 3, 5 and 7');
    expect(numberRanges([4, 5])).toBe('4 and 5');
    expect(numberRanges([2])).toBe('2');
  });
  it('read with photos: the sentence, the tile and the checks follow the captions', () => {
    const d = docByKey('sop')!;
    const steps = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, c: { do: `Step ${i + 1}`, ...(i === 0 ? { care: 'safety' } : {}) } }));
    const base = { title: 'Changeover', use: 'changeover', owner: 'Sam', steps };
    const some = runDoc(d, base, [ph('a', 'stepPhotos', '1 — isolate'), ph('b', 'stepPhotos', '3 — tube'), ph('c', 'stepPhotos', 'no number'), ph('x', 'other', '2 — wrong box')], CTX);
    expect(some.result.sentence).toBe('Changeover: 8 steps, 2 with a photo, 1 step to take care over (safety).');
    expect(some.tiles.find(t => t.k === 'With a photo')?.v).toBe('2 of 8');
    expect(some.problems.map(p => p.say).join(' | ')).toContain('Steps 2 and 4 to 8 have no photo');
    expect(some.problems.map(p => p.say).join(' | ')).toContain('1 photo has no step number');
    const all = runDoc(d, base, steps.map((_, i) => ph(`p${i}`, 'stepPhotos', `${i + 1} — x`)), CTX);
    expect(all.result.sentence).toBe('Changeover: 8 steps, every step with a photo, 1 step to take care over (safety).');
    expect(all.problems.length).toBe(0);
    const struck = runDoc(d, base, [{ ...ph('z', 'stepPhotos', '1 — x'), struck: true }], CTX);
    expect(struck.tiles.find(t => t.k === 'With a photo')?.v).toBe('0 of 8');
  });
  it('is agreed by the line manager and has no money of its own, said', () => {
    const d = docByKey('sop')!;
    expect(d.signoff?.by).toBe('the line manager');
    expect(runDoc(d, { title: 'x', use: 'clean', owner: 'a', steps: [{ id: '1', c: { do: 'a' } }] }, [], CTX).result.money.none).toContain('no money of its own');
  });
});

describe('the job breakdown (cases-teach.py J1)', () => {
  const learner = (name: string, taught: string, tryOut: 'passed' | 'again', signed?: string, recheck?: 'passed' | 'failed'): Learner => ({ name, taught, tryOut, ...(signed ? { signed } : {}), ...(recheck ? { recheck } : {}) });
  const rows: Learner[] = [
    learner('Alex', '2026-09-24', 'passed', '2026-09-25'), learner('Bea', '2026-10-01', 'passed', '2026-10-02', 'passed'), learner('Chris', '2026-10-06', 'passed', '2026-10-08'),
    learner('Dee', '2026-10-08', 'passed', '2026-10-10'), learner('Eli', '2026-10-13', 'passed', '2026-10-16'), learner('Fay', '2026-10-15', 'passed', '2026-10-20'),
    learner('Gus', '2026-10-27', 'again'), learner('Hal', '2026-10-28', 'again'), learner('Ivy', '2026-10-29', 'again'),
  ];
  it('9 trained, 6 signed off = 66.7%, 3 to try again; the days 1,1,2,2,3,5 average 2.33', () => {
    const t = teachingOf(rows, '2026-11-01');
    expect(t).toMatchObject({ trained: 9, signedOff: 6, again: 3, waiting: 0 });
    expect(t.rate).toBeCloseTo(6 / 9, 10);
    expect(t.days).toBeCloseTo(14 / 6, 10);
  });
  it('signed off on 25 September is due on 25 October and overdue on 1 November; the 30-day re-check passed is not open', () => {
    const t = teachingOf(rows, '2026-11-01');
    expect(t.overdue).toBe(1);
    expect(t.due).toBe(4);
    expect(teachingOf(rows, '2026-10-20').overdue).toBe(0);
    expect(teachingOf([{ name: 'Z', taught: '2026-10-01', tryOut: 'passed' }], '2026-11-01')).toMatchObject({ undated: 1, overdue: 0, days: undefined });
    expect(teachingOf([], '2026-11-01').rate).toBeUndefined();
  });
  it('key points are split on semicolons and new lines, never on a comma', () => {
    expect(pointsOf('Cut on the guide line, clean; both hands clear\nisolator locked off')).toEqual(['Cut on the guide line, clean', 'both hands clear', 'isolator locked off']);
    expect(pointsOf(undefined)).toEqual([]);
  });
  it('9 × (14 − 8) = 54 paid hours; not shown when with is not fewer, or a figure is missing', () => {
    expect(hoursSaved(9, 14, 8)).toBe(54);
    expect(54 * 14.7).toBeCloseTo(793.8, 10);
    expect(hoursSaved(9, 6, 7)).toBeUndefined();
    expect(hoursSaved(9, undefined, 7)).toBeUndefined();
    expect(hoursSaved(0, 14, 8)).toBeUndefined();
  });
  it('the money names the one input missing, and nothing waits on it', () => {
    const d = docByKey('job-instruction')!;
    const base = { title: 'x', instructor: 'a', steps: [{ id: '1', c: { step: 'a', keys: 'k', reasons: 'r' } }], learners: [{ id: 'l', c: { name: 'B', taught: '2026-10-01', tryout: 'passed', signed: '2026-10-02' } }] };
    expect(runDoc(d, base, [], CTX).result.money.missing[0]).toContain('with and without');
    expect(runDoc(d, { ...base, without: 10, with: 5 }, [], CTX).result.money.missing[0]).toContain('£ an hour');
    expect(runDoc(d, { ...base, without: 10, with: 5, rate: 12 }, [], CTX).result.money.text).toBe('Taught by the breakdown, 1 learner reached the standard in 5 h instead of 10 h: 5 paid hours × £12.00 = £60.00.');
  });
});

describe('the one-point lesson (cases-teach.py O1)', () => {
  it('six of six on days and five of six on nights: 11 of 12 = 91.7%', () => {
    const people = [...Array.from({ length: 6 }, (_, i) => ({ name: `d${i}`, shift: 'Days', taught: true })), ...Array.from({ length: 6 }, (_, i) => ({ name: `n${i}`, shift: 'Nights', taught: i < 5 }))];
    const c = coverOf(people);
    expect(c).toMatchObject({ taught: 11, total: 12 });
    expect(c.rate).toBeCloseTo(11 / 12, 10);
    expect(c.shifts).toEqual([{ shift: 'Days', taught: 6, total: 6 }, { shift: 'Nights', taught: 5, total: 6 }]);
    expect(coverOf([{ name: 'a', shift: ' ', taught: false }]).shifts[0].shift).toBe('Everyone');
    expect(coverOf([]).rate).toBeUndefined();
  });
  it('pictures: none is listed; a trouble case with only the right way asks for the wrong way', () => {
    const d = docByKey('one-point-lesson')!;
    const base = { title: 'Film guide', kind: 'trouble', point: 'Set it to 2 mm.', author: 'Sam', written: '2026-10-30', people: [{ id: 'a', c: { name: 'Ann', taught: '2026-10-31' } }] };
    const say = (ps: DocPhoto[]) => runDoc(d, base, ps, CTX).problems.map(p => p.say).join(' | ');
    expect(say([])).toContain('No picture yet');
    expect(say([ph('r', 'rightPhotos', 'guide at 2 mm')])).toContain('shows the wrong way as well');
    expect(say([ph('r', 'rightPhotos'), ph('w', 'wrongPhotos')])).not.toContain('picture');
    expect(runDoc(d, base, [ph('r', 'rightPhotos'), ph('w', 'wrongPhotos')], CTX).tiles.find(t => t.k === 'Pictures')).toMatchObject({ v: '2', of: '1 right · 1 wrong' });
  });
  it('the trouble-came-back box is asked of a trouble case only', () => {
    const d = docByKey('one-point-lesson')!;
    expect(runDoc(d, { kind: 'basic', back: 'yes' }, [], CTX).values.back).toBeUndefined();
    expect(runDoc(d, { kind: 'trouble', back: 'yes' }, [], CTX).values.back).toBe('yes');
  });
  it('a week and a day is past the week: not taught 7 days on is not yet the team leader’s action', () => {
    const d = docByKey('one-point-lesson')!;
    const v = { title: 't', kind: 'basic', point: 'p', author: 'a', written: '2026-10-25', people: [{ id: 'a', c: { name: 'Ann' } }] };
    expect(runDoc(d, v, [], { today: '2026-11-01' }).problems.map(p => p.say).join('|')).not.toContain('still not taught');
    expect(runDoc(d, v, [], { today: '2026-11-02' }).problems.map(p => p.say).join('|')).toContain('still not taught 8 days after');
  });
});
