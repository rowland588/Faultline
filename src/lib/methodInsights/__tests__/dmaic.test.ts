import { describe, expect, it } from 'vitest';
import { dmaicInsight } from '../dmaic';
import { fieldsOf } from '../../methodSheet';

const today = '2026-11-10';
const run = (answers: Record<string, string>) => dmaicInsight({ answers, studies: [], owed: [], today });
const fill = (phase: string, o: Record<string, string> = {}) => { for (const f of fieldsOf('dmaic', phase)) o[f.id] = 'x'; return o; };

describe('DMAIC reads its own reviews', () => {
  it('nothing written: nothing flagged and the common next stands', () => {
    expect(run({})).toEqual({ attention: [] });
  });
  it('Define fully written with no review: next is to book it; with a future day, to hold it on that day; past, hold it now', () => {
    const a = fill('Define');
    expect(run(a).next).toBe('Next: Define is fully written — book and hold its review.');
    expect(run({ ...a, rv_define_when: '2026-11-14' }).next).toBe('Next: hold Define’s review on 14 Nov 2026.');
    const late = run({ ...a, rv_define_when: '2026-11-03' });
    expect(late.next).toBe('Next: Define’s review was booked for 3 Nov 2026 — hold it and write what it decided.');
    expect(late.attention?.[0]).toMatchObject({ kind: 'late', tone: 'a', text: 'Define’s review was booked for 3 Nov 2026 and has no decision written yet.' });
  });
  it('a held review is red with its reason, and the next move is to put it right', () => {
    const r = run({ ...fill('Define'), rv_define_result: 'passed', rv_define_who: 'Tanya', rv_define_when: '2026-11-01', rv_measure_result: 'held', rv_measure_note: 'gauge R&R at 34%' });
    expect(r.attention).toContainEqual({ kind: 'unproved', tone: 'r', text: 'Measure was held at its review — gauge R&R at 34%. The phases after it wait for it to pass.' });
    expect(r.next).toBe('Next: put right what Measure was held for, then hold its review again.');
  });
  it('held with no note says so; conditions with none written and a pass with no name or day are flagged', () => {
    const r = run({ rv_define_result: 'conditions', rv_measure_result: 'held' });
    const t = r.attention!.map(a => a.text);
    expect(t).toContain('Define passed its review with conditions, but the conditions are not written — write what has to be done, and by when.');
    expect(t).toContain('Define is marked passed with conditions with no name and no day — a review is only a record if it says who held it and when.');
    expect(t).toContain('Measure was held at its review — what it was held for is not written. The phases after it wait for it to pass.');
  });
  it('a phase started before the one before it has passed is a note, never a block', () => {
    const r = run({ ...fill('Define'), mq: 'x', baseline: 'today 4%' });
    expect(r.attention).toContainEqual({ kind: 'unproved', tone: 'n', text: 'Measure is under way, but Define has not passed its review yet.' });
  });
  it('Control passed with nobody named to hand over to is amber; all five passed says to hand over', () => {
    const all: Record<string, string> = {};
    for (const p of ['define', 'measure', 'analyse', 'improve', 'control']) { all[`rv_${p}_result`] = 'passed'; all[`rv_${p}_who`] = 'A'; all[`rv_${p}_when`] = '2026-10-01'; }
    const r = run(all);
    expect(r.attention).toEqual([{ kind: 'unproved', tone: 'a', text: 'Control has passed its review but nobody is named as the process owner it is handed to.' }]);
    expect(r.next).toBe('Every phase has passed its review — view the project report and hand the process over.');
    expect(run({ ...all, handover: 'Priya, 1 Nov' }).attention).toEqual([]);
  });
});
